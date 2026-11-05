"""Cambios de estado de una solicitud con historial y notificaciones."""

from django.db import transaction
from django.utils import timezone

from ..models import EstadoSolicitud, HistorialEstado
from . import notificaciones


class TransicionInvalida(Exception):
    pass


def liberar_tecnico(solicitud):
    tecnico = solicitud.tecnico
    if tecnico and not tecnico.disponible:
        tecnico.disponible = True
        tecnico.save(update_fields=["disponible"])


@transaction.atomic
def cambiar_estado(solicitud, nuevo_estado, usuario=None, comentario="", notificar=True):
    if not solicitud.puede_pasar_a(nuevo_estado):
        raise TransicionInvalida(
            f"No se puede pasar de '{solicitud.get_estado_display()}' a "
            f"'{EstadoSolicitud(nuevo_estado).label}'."
        )

    anterior = solicitud.estado
    ahora = timezone.now()
    solicitud.estado = nuevo_estado

    if nuevo_estado == EstadoSolicitud.ASIGNADA:
        solicitud.asignado_en = ahora
    elif nuevo_estado == EstadoSolicitud.EN_SITIO:
        solicitud.llegada_en = ahora
        solicitud.eta_minutos = 0
        solicitud.hora_estimada_llegada = ahora
    elif nuevo_estado == EstadoSolicitud.FINALIZADA:
        solicitud.finalizado_en = ahora
        if comentario:
            solicitud.observaciones_cierre = comentario
        liberar_tecnico(solicitud)
    elif nuevo_estado == EstadoSolicitud.CANCELADA:
        solicitud.cancelado_en = ahora
        solicitud.motivo_cancelacion = comentario
        liberar_tecnico(solicitud)

    solicitud.save()
    HistorialEstado.objects.create(
        solicitud=solicitud,
        estado_anterior=anterior,
        estado_nuevo=nuevo_estado,
        comentario=comentario[:255],
        usuario=usuario,
    )

    if notificar:
        transaction.on_commit(lambda: notificaciones.notificar_cambio_estado(solicitud, nuevo_estado))
    return solicitud
