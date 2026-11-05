"""
Notificaciones internas de la plataforma.

Se guardan en la tabla Notificacion y el frontend las consulta. Si más
adelante se quiere enviar SMS / email / push, basta con agregar el canal en
`enviar()` sin tocar el resto de la lógica.
"""

import logging

from django.utils import timezone

from ..models import EstadoSolicitud, Notificacion

logger = logging.getLogger(__name__)


def enviar(usuario, titulo, mensaje, solicitud=None):
    if usuario is None:
        return None
    notificacion = Notificacion.objects.create(
        usuario=usuario, solicitud=solicitud, titulo=titulo, mensaje=mensaje
    )
    logger.info("Notificación a %s: %s", usuario.email, titulo)
    return notificacion


def _detalle_asignacion(solicitud):
    partes = [f"Proveedor: {solicitud.proveedor.nombre}"]
    if solicitud.tecnico:
        partes.append(f"Técnico: {solicitud.tecnico.nombre}")
        partes.append(f"Contacto: {solicitud.tecnico.telefono}")
    else:
        partes.append(f"Contacto: {solicitud.proveedor.telefono}")
    if solicitud.eta_minutos is not None:
        hora = timezone.localtime(solicitud.hora_estimada_llegada).strftime("%I:%M %p")
        partes.append(f"Tiempo estimado de llegada: {solicitud.eta_minutos} min (aprox. {hora})")
    return "\n".join(partes)


MENSAJES_ASEGURADO = {
    EstadoSolicitud.ASIGNADA: "Tu asistencia fue asignada",
    EstadoSolicitud.SIN_PROVEEDOR: "Estamos buscando un proveedor",
    EstadoSolicitud.EN_CAMINO: "El técnico va en camino",
    EstadoSolicitud.EN_SITIO: "El técnico llegó a tu ubicación",
    EstadoSolicitud.EN_PROCESO: "Tu servicio está en proceso",
    EstadoSolicitud.FINALIZADA: "Servicio finalizado",
    EstadoSolicitud.CANCELADA: "Solicitud cancelada",
}


def notificar_cambio_estado(solicitud, estado_nuevo):
    titulo = MENSAJES_ASEGURADO.get(estado_nuevo)
    if not titulo:
        return

    if estado_nuevo == EstadoSolicitud.ASIGNADA:
        mensaje = _detalle_asignacion(solicitud)
    elif estado_nuevo == EstadoSolicitud.SIN_PROVEEDOR:
        mensaje = (
            "En este momento no hay proveedores disponibles cerca de tu ubicación. "
            "Nuestro equipo seguirá intentando asignar tu servicio."
        )
    elif estado_nuevo == EstadoSolicitud.EN_CAMINO and solicitud.eta_minutos is not None:
        mensaje = f"Llegada estimada en {solicitud.eta_minutos} minutos."
    elif estado_nuevo == EstadoSolicitud.FINALIZADA:
        mensaje = "Gracias por usar nuestras asistencias. Califica el servicio recibido."
    elif estado_nuevo == EstadoSolicitud.CANCELADA:
        mensaje = solicitud.motivo_cancelacion or "La solicitud fue cancelada."
    else:
        mensaje = f"Estado actual: {solicitud.get_estado_display()}."

    enviar(solicitud.asegurado, titulo, mensaje, solicitud)

    # Avisar al proveedor si el asegurado cancela un servicio que ya tenía asignado.
    if estado_nuevo == EstadoSolicitud.CANCELADA and solicitud.proveedor:
        destinatarios = set(solicitud.proveedor.usuarios.filter(is_active=True))
        if solicitud.tecnico and solicitud.tecnico.usuario:
            destinatarios.add(solicitud.tecnico.usuario)
        for usuario in destinatarios:
            enviar(
                usuario,
                f"Servicio #{solicitud.pk} cancelado",
                solicitud.motivo_cancelacion or "El asegurado canceló el servicio.",
                solicitud,
            )

    # Avisar a los usuarios del proveedor (y al técnico) cuando se les asigna un servicio.
    if estado_nuevo == EstadoSolicitud.ASIGNADA and solicitud.proveedor:
        tecnico_usuario = solicitud.tecnico.usuario if solicitud.tecnico else None
        if tecnico_usuario:
            enviar(
                tecnico_usuario,
                f"Te asignaron el servicio #{solicitud.pk}",
                f"{solicitud.tipo_servicio.nombre} - contacto asegurado: {solicitud.telefono_contacto}",
                solicitud,
            )
        # Usuarios administrativos del proveedor (los que no son técnicos).
        for usuario in solicitud.proveedor.usuarios.filter(is_active=True, tecnico__isnull=True):
            enviar(
                usuario,
                f"Nuevo servicio asignado #{solicitud.pk}",
                f"{solicitud.tipo_servicio.nombre} en {solicitud.direccion or 'ubicación GPS'}. "
                f"{solicitud.descripcion[:200]}",
                solicitud,
            )
