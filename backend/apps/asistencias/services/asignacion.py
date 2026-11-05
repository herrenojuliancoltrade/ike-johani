"""
Motor de búsqueda y asignación de proveedores.

1. Filtra proveedores activos/disponibles que prestan el tipo de servicio.
2. Descarta los que están fuera de su radio de cobertura o sin capacidad.
3. Elige el técnico disponible más cercano de cada proveedor.
4. Calcula un puntaje (menor = mejor) con distancia, carga actual y calificación.
5. Asigna el mejor candidato de forma atómica (evita que un técnico quede
   asignado a dos servicios a la vez) y calcula el tiempo estimado de llegada.
"""

from dataclasses import dataclass
from decimal import Decimal

from django.conf import settings
from django.db import transaction
from django.db.models import Count, Q

from apps.proveedores.models import Proveedor, Tecnico

from ..models import (
    ESTADOS_ACTIVOS,
    EstadoSolicitud,
    IntentoAsignacion,
    SolicitudAsistencia,
)
from .estados import TransicionInvalida, cambiar_estado, liberar_tecnico
from .geo import distancia_km, estimar_minutos, hora_llegada


@dataclass
class Candidato:
    proveedor: Proveedor
    tecnico: Tecnico | None
    distancia_km: float
    eta_minutos: int
    carga_actual: int
    puntaje: float

    def como_dict(self):
        return {
            "proveedor_id": self.proveedor.pk,
            "proveedor": self.proveedor.nombre,
            "tecnico_id": self.tecnico.pk if self.tecnico else None,
            "tecnico": self.tecnico.nombre if self.tecnico else None,
            "distancia_km": round(self.distancia_km, 2),
            "eta_minutos": self.eta_minutos,
            "carga_actual": self.carga_actual,
            "puntaje": round(self.puntaje, 3),
        }


def _tecnicos_disponibles(proveedor, tipo_servicio):
    # Técnicos sin servicios configurados atienden todo lo del proveedor.
    return (
        proveedor.tecnicos.filter(activo=True, disponible=True)
        .filter(Q(servicios__isnull=True) | Q(servicios=tipo_servicio))
        .distinct()
    )


def _tecnico_mas_cercano(tecnicos, lat, lon, proveedor):
    mejor, mejor_dist = None, None
    for t in tecnicos:
        if t.latitud is not None and t.longitud is not None:
            d = distancia_km(t.latitud, t.longitud, lat, lon)
        else:
            d = distancia_km(proveedor.latitud, proveedor.longitud, lat, lon)
        if mejor is None or d < mejor_dist:
            mejor, mejor_dist = t, d
    return mejor, mejor_dist


def proveedores_excluidos(solicitud):
    return set(
        solicitud.intentos.filter(
            resultado__in=[
                IntentoAsignacion.Resultado.RECHAZADO,
                IntentoAsignacion.Resultado.REASIGNADO,
            ]
        ).values_list("proveedor_id", flat=True)
    )


def buscar_candidatos(solicitud, excluir=None):
    """Devuelve la lista de candidatos ordenada del mejor al peor."""
    conf = settings.ASIGNACION
    tipo = solicitud.tipo_servicio
    lat, lon = solicitud.latitud, solicitud.longitud
    excluir = set(excluir or ()) | proveedores_excluidos(solicitud)

    proveedores = (
        Proveedor.objects.filter(activo=True, disponible=True, servicios=tipo)
        .exclude(pk__in=excluir)
        .annotate(
            carga=Count(
                "solicitudes",
                filter=Q(solicitudes__estado__in=ESTADOS_ACTIVOS),
                distinct=True,
            ),
            n_tecnicos=Count("tecnicos", filter=Q(tecnicos__activo=True), distinct=True),
        )
        .distinct()
    )

    candidatos = []
    for p in proveedores:
        distancia_base = distancia_km(p.latitud, p.longitud, lat, lon)

        if tipo.requiere_desplazamiento and distancia_base > p.radio_cobertura_km:
            continue

        tecnico = None
        distancia = distancia_base
        if p.n_tecnicos:
            tecnico, distancia = _tecnico_mas_cercano(
                _tecnicos_disponibles(p, tipo), lat, lon, p
            )
            if tecnico is None:
                continue  # todos sus técnicos están ocupados
        elif p.carga >= p.capacidad_simultanea:
            continue

        if tipo.requiere_desplazamiento:
            eta = estimar_minutos(distancia, p.velocidad_promedio_kmh)
        else:
            distancia = 0.0
            eta = conf["MINUTOS_ALISTAMIENTO"]  # tiempo de contacto remoto

        puntaje = (
            conf["PESO_DISTANCIA"] * distancia
            + conf["PESO_CARGA"] * p.carga
            + conf["PESO_CALIFICACION"] * (5 - float(p.calificacion))
        )
        candidatos.append(Candidato(p, tecnico, distancia, eta, p.carga, puntaje))

    candidatos.sort(key=lambda c: (c.puntaje, c.distancia_km))
    return candidatos


def _reservar(candidato):
    """Reserva el técnico/capacidad de forma atómica. Devuelve True si lo logra."""
    if candidato.tecnico:
        actualizados = Tecnico.objects.filter(
            pk=candidato.tecnico.pk, disponible=True, activo=True
        ).update(disponible=False)
        return actualizados == 1

    # Proveedor sin técnicos registrados: se valida su capacidad con bloqueo.
    proveedor = Proveedor.objects.select_for_update().get(pk=candidato.proveedor.pk)
    carga = proveedor.solicitudes.filter(estado__in=ESTADOS_ACTIVOS).count()
    return carga < proveedor.capacidad_simultanea


@transaction.atomic
def asignar_proveedor(solicitud, usuario=None, excluir=None, comentario=""):
    """
    Busca y asigna el mejor proveedor. Si no hay ninguno, deja la solicitud
    en SIN_PROVEEDOR para que se reintente luego.
    """
    solicitud = SolicitudAsistencia.objects.select_for_update().get(pk=solicitud.pk)

    for candidato in buscar_candidatos(solicitud, excluir=excluir):
        if not _reservar(candidato):
            continue  # otro proceso lo tomó primero; probar el siguiente

        solicitud.proveedor = candidato.proveedor
        solicitud.tecnico = candidato.tecnico
        solicitud.distancia_km = Decimal(str(round(candidato.distancia_km, 2)))
        solicitud.eta_minutos = candidato.eta_minutos
        solicitud.hora_estimada_llegada = hora_llegada(candidato.eta_minutos)

        IntentoAsignacion.objects.create(
            solicitud=solicitud,
            proveedor=candidato.proveedor,
            tecnico=candidato.tecnico,
            distancia_km=solicitud.distancia_km,
            puntaje=Decimal(str(round(candidato.puntaje, 3))),
        )
        return cambiar_estado(
            solicitud,
            EstadoSolicitud.ASIGNADA,
            usuario=usuario,
            comentario=comentario or f"Asignado a {candidato.proveedor.nombre}",
        )

    if solicitud.estado == EstadoSolicitud.SIN_PROVEEDOR:
        return solicitud  # sigue sin proveedor: no repetir historial ni notificación

    solicitud.proveedor = None
    solicitud.tecnico = None
    solicitud.distancia_km = None
    solicitud.eta_minutos = None
    solicitud.hora_estimada_llegada = None
    return cambiar_estado(
        solicitud,
        EstadoSolicitud.SIN_PROVEEDOR,
        usuario=usuario,
        comentario="No se encontraron proveedores disponibles.",
    )


@transaction.atomic
def liberar_y_reasignar(solicitud, resultado, motivo="", usuario=None):
    """
    El proveedor rechaza el servicio (o la aseguradora lo reasigna):
    se libera el técnico, se marca el intento y se busca el siguiente candidato.
    """
    solicitud = SolicitudAsistencia.objects.select_for_update().get(pk=solicitud.pk)
    if solicitud.estado != EstadoSolicitud.ASIGNADA or not solicitud.proveedor_id:
        raise TransicionInvalida("Solo se puede reasignar una solicitud en estado 'Asignada'.")

    intento = solicitud.intentos.filter(
        proveedor_id=solicitud.proveedor_id, resultado=IntentoAsignacion.Resultado.ASIGNADO
    ).last()
    if intento:
        intento.resultado = resultado
        intento.motivo = motivo[:255]
        intento.save(update_fields=["resultado", "motivo"])

    liberar_tecnico(solicitud)
    return asignar_proveedor(solicitud, usuario=usuario, comentario=f"Reasignación: {motivo}"[:255])


def recalcular_eta_desde_tecnico(solicitud):
    """Con la nueva ubicación del técnico recalcula distancia y ETA."""
    tecnico = solicitud.tecnico
    if not tecnico or tecnico.latitud is None or not solicitud.tipo_servicio.requiere_desplazamiento:
        return solicitud
    if solicitud.estado not in (EstadoSolicitud.ASIGNADA, EstadoSolicitud.EN_CAMINO):
        return solicitud

    distancia = distancia_km(tecnico.latitud, tecnico.longitud, solicitud.latitud, solicitud.longitud)
    incluir_alistamiento = solicitud.estado == EstadoSolicitud.ASIGNADA
    eta = estimar_minutos(distancia, solicitud.proveedor.velocidad_promedio_kmh, incluir_alistamiento)
    solicitud.distancia_km = Decimal(str(round(distancia, 2)))
    solicitud.eta_minutos = eta
    solicitud.hora_estimada_llegada = hora_llegada(eta)
    solicitud.save(update_fields=["distancia_km", "eta_minutos", "hora_estimada_llegada", "actualizado"])
    return solicitud
