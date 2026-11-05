import uuid

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class EstadoSolicitud(models.TextChoices):
    PENDIENTE = "PENDIENTE", "Pendiente"
    SIN_PROVEEDOR = "SIN_PROVEEDOR", "Sin proveedor disponible"
    ASIGNADA = "ASIGNADA", "Proveedor asignado"
    EN_CAMINO = "EN_CAMINO", "Técnico en camino"
    EN_SITIO = "EN_SITIO", "Técnico en el sitio"
    EN_PROCESO = "EN_PROCESO", "Servicio en proceso"
    FINALIZADA = "FINALIZADA", "Finalizada"
    CANCELADA = "CANCELADA", "Cancelada"


# Máquina de estados: desde qué estado se puede pasar a cuáles.
TRANSICIONES = {
    EstadoSolicitud.PENDIENTE: {
        EstadoSolicitud.ASIGNADA,
        EstadoSolicitud.SIN_PROVEEDOR,
        EstadoSolicitud.CANCELADA,
    },
    EstadoSolicitud.SIN_PROVEEDOR: {
        EstadoSolicitud.ASIGNADA,
        EstadoSolicitud.SIN_PROVEEDOR,
        EstadoSolicitud.CANCELADA,
    },
    EstadoSolicitud.ASIGNADA: {
        EstadoSolicitud.ASIGNADA,  # reasignación
        EstadoSolicitud.SIN_PROVEEDOR,  # rechazo sin más candidatos
        EstadoSolicitud.EN_CAMINO,
        EstadoSolicitud.EN_PROCESO,  # servicios remotos (ej. legal)
        EstadoSolicitud.CANCELADA,
    },
    EstadoSolicitud.EN_CAMINO: {
        EstadoSolicitud.EN_SITIO,
        EstadoSolicitud.CANCELADA,
    },
    EstadoSolicitud.EN_SITIO: {
        EstadoSolicitud.EN_PROCESO,
        EstadoSolicitud.FINALIZADA,
    },
    EstadoSolicitud.EN_PROCESO: {EstadoSolicitud.FINALIZADA},
    EstadoSolicitud.FINALIZADA: set(),
    EstadoSolicitud.CANCELADA: set(),
}

ESTADOS_ACTIVOS = (
    EstadoSolicitud.ASIGNADA,
    EstadoSolicitud.EN_CAMINO,
    EstadoSolicitud.EN_SITIO,
    EstadoSolicitud.EN_PROCESO,
)
ESTADOS_CANCELABLES_POR_ASEGURADO = (
    EstadoSolicitud.PENDIENTE,
    EstadoSolicitud.SIN_PROVEEDOR,
    EstadoSolicitud.ASIGNADA,
    EstadoSolicitud.EN_CAMINO,
)


class SolicitudAsistencia(models.Model):
    codigo = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    asegurado = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.PROTECT, related_name="solicitudes"
    )
    poliza = models.ForeignKey(
        "polizas.Poliza", on_delete=models.PROTECT, related_name="solicitudes"
    )
    tipo_servicio = models.ForeignKey(
        "proveedores.TipoServicio", on_delete=models.PROTECT, related_name="solicitudes"
    )
    descripcion = models.TextField("descripción de la situación")

    # Ubicación del asegurado
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    direccion = models.CharField(max_length=255, blank=True)
    referencia = models.CharField("punto de referencia", max_length=255, blank=True)
    telefono_contacto = models.CharField(max_length=20)

    # Destino (ej. taller al que se lleva el vehículo con la grúa)
    destino_direccion = models.CharField(max_length=255, blank=True)
    destino_latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    destino_longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)

    estado = models.CharField(
        max_length=20,
        choices=EstadoSolicitud.choices,
        default=EstadoSolicitud.PENDIENTE,
        db_index=True,
    )

    # Asignación
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="solicitudes",
    )
    tecnico = models.ForeignKey(
        "proveedores.Tecnico",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="solicitudes",
    )
    distancia_km = models.DecimalField(max_digits=7, decimal_places=2, null=True, blank=True)
    eta_minutos = models.PositiveIntegerField("tiempo estimado de llegada (min)", null=True, blank=True)
    hora_estimada_llegada = models.DateTimeField(null=True, blank=True)

    # Tiempos del ciclo de vida
    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)
    asignado_en = models.DateTimeField(null=True, blank=True)
    llegada_en = models.DateTimeField(null=True, blank=True)
    finalizado_en = models.DateTimeField(null=True, blank=True)
    cancelado_en = models.DateTimeField(null=True, blank=True)
    motivo_cancelacion = models.CharField(max_length=255, blank=True)

    # Cierre
    observaciones_cierre = models.TextField(blank=True)
    calificacion = models.PositiveSmallIntegerField(
        null=True, blank=True, validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comentario_calificacion = models.TextField(blank=True)

    class Meta:
        ordering = ["-creado"]
        verbose_name = "solicitud de asistencia"
        verbose_name_plural = "solicitudes de asistencia"
        indexes = [models.Index(fields=["proveedor", "estado"])]

    def __str__(self):
        return f"#{self.pk} {self.tipo_servicio} - {self.get_estado_display()}"

    def puede_pasar_a(self, nuevo_estado):
        return nuevo_estado in TRANSICIONES.get(self.estado, set())

    @property
    def activa(self):
        return self.estado in ESTADOS_ACTIVOS


class HistorialEstado(models.Model):
    solicitud = models.ForeignKey(
        SolicitudAsistencia, on_delete=models.CASCADE, related_name="historial"
    )
    estado_anterior = models.CharField(max_length=20, choices=EstadoSolicitud.choices, blank=True)
    estado_nuevo = models.CharField(max_length=20, choices=EstadoSolicitud.choices)
    comentario = models.CharField(max_length=255, blank=True)
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL
    )
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha", "id"]
        verbose_name = "historial de estado"
        verbose_name_plural = "historial de estados"

    def __str__(self):
        return f"{self.solicitud_id}: {self.estado_anterior} -> {self.estado_nuevo}"


class IntentoAsignacion(models.Model):
    """Auditoría de cada proveedor al que se le asignó (o que rechazó) un servicio."""

    class Resultado(models.TextChoices):
        ASIGNADO = "ASIGNADO", "Asignado"
        RECHAZADO = "RECHAZADO", "Rechazado por el proveedor"
        REASIGNADO = "REASIGNADO", "Reasignado por la aseguradora"

    solicitud = models.ForeignKey(
        SolicitudAsistencia, on_delete=models.CASCADE, related_name="intentos"
    )
    proveedor = models.ForeignKey("proveedores.Proveedor", on_delete=models.CASCADE)
    tecnico = models.ForeignKey(
        "proveedores.Tecnico", null=True, blank=True, on_delete=models.SET_NULL
    )
    distancia_km = models.DecimalField(max_digits=7, decimal_places=2)
    puntaje = models.DecimalField(max_digits=10, decimal_places=3)
    resultado = models.CharField(max_length=15, choices=Resultado.choices, default=Resultado.ASIGNADO)
    motivo = models.CharField(max_length=255, blank=True)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["fecha", "id"]
        verbose_name = "intento de asignación"
        verbose_name_plural = "intentos de asignación"


class Notificacion(models.Model):
    usuario = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notificaciones"
    )
    solicitud = models.ForeignKey(
        SolicitudAsistencia,
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name="notificaciones",
    )
    titulo = models.CharField(max_length=150)
    mensaje = models.TextField()
    leida = models.BooleanField(default=False)
    fecha = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-fecha"]
        verbose_name = "notificación"
        verbose_name_plural = "notificaciones"

    def __str__(self):
        return f"{self.usuario}: {self.titulo}"
