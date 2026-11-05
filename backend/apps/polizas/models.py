from datetime import timedelta

from django.db import models
from django.utils import timezone


class Poliza(models.Model):
    """
    Póliza cargada por la aseguradora. El asegurado la vincula a su cuenta
    al registrarse validando número de póliza + documento del titular.
    """

    numero = models.CharField("número de póliza", max_length=40, unique=True)
    titular_nombre = models.CharField(max_length=150)
    titular_documento = models.CharField(max_length=20, db_index=True)
    asegurado = models.ForeignKey(
        "usuarios.Usuario",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="polizas",
    )

    # Vehículo asegurado
    placa = models.CharField(max_length=10, blank=True)
    marca = models.CharField(max_length=50, blank=True)
    linea = models.CharField(max_length=50, blank=True)
    modelo = models.PositiveIntegerField(null=True, blank=True)
    color = models.CharField(max_length=30, blank=True)

    fecha_inicio = models.DateField()
    fecha_fin = models.DateField()
    activa = models.BooleanField(default=True)
    servicios_cubiertos = models.ManyToManyField(
        "proveedores.TipoServicio", related_name="polizas", blank=True
    )
    # 0 = ilimitado
    max_asistencias_anuales = models.PositiveIntegerField(default=0)

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-fecha_fin"]
        verbose_name = "póliza"
        verbose_name_plural = "pólizas"

    def __str__(self):
        return f"{self.numero} - {self.titular_nombre}"

    @property
    def vigente(self):
        hoy = timezone.localdate()
        return self.activa and self.fecha_inicio <= hoy <= self.fecha_fin

    def cubre(self, tipo_servicio):
        return self.servicios_cubiertos.filter(pk=tipo_servicio.pk).exists()

    def asistencias_usadas_ultimo_anio(self):
        desde = timezone.now() - timedelta(days=365)
        return (
            self.solicitudes.filter(creado__gte=desde)
            .exclude(estado__in=["CANCELADA", "SIN_PROVEEDOR"])
            .count()
        )

    def validar_para_servicio(self, tipo_servicio):
        """Devuelve una lista de errores; vacía si la póliza puede usarse."""
        errores = []
        if not self.vigente:
            errores.append("La póliza no está vigente.")
        if not self.cubre(tipo_servicio):
            errores.append(f"La póliza no cubre el servicio '{tipo_servicio.nombre}'.")
        if (
            self.max_asistencias_anuales
            and self.asistencias_usadas_ultimo_anio() >= self.max_asistencias_anuales
        ):
            errores.append("Se alcanzó el número máximo de asistencias anuales de la póliza.")
        return errores
