from decimal import Decimal

from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models


class TipoServicio(models.Model):
    """Catálogo de asistencias: grúa, carro taller, asistencia legal, etc."""

    class Codigo(models.TextChoices):
        GRUA = "GRUA", "Servicio de grúa"
        CARRO_TALLER = "CARRO_TALLER", "Carro taller"
        LEGAL = "LEGAL", "Asistencia legal"
        CERRAJERIA = "CERRAJERIA", "Cerrajería"
        PASO_CORRIENTE = "PASO_CORRIENTE", "Paso de corriente"
        CAMBIO_LLANTA = "CAMBIO_LLANTA", "Cambio de llanta"
        COMBUSTIBLE = "COMBUSTIBLE", "Envío de combustible"
        OTRA = "OTRA", "Otra asistencia"

    codigo = models.CharField(max_length=30, unique=True, choices=Codigo.choices)
    nombre = models.CharField(max_length=100)
    descripcion = models.TextField(blank=True)
    # Los servicios remotos (ej. legal) no requieren desplazamiento físico.
    requiere_desplazamiento = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "tipo de servicio"
        verbose_name_plural = "tipos de servicio"

    def __str__(self):
        return self.nombre


class Proveedor(models.Model):
    """Empresa que presta asistencias (grúas, talleres, abogados...)."""

    nombre = models.CharField("razón social", max_length=150)
    nit = models.CharField(max_length=20, unique=True)
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    direccion = models.CharField(max_length=255, blank=True)
    ciudad = models.CharField(max_length=80, blank=True)
    servicios = models.ManyToManyField(TipoServicio, related_name="proveedores")

    # Base de operación y cobertura
    latitud = models.DecimalField(max_digits=9, decimal_places=6)
    longitud = models.DecimalField(max_digits=9, decimal_places=6)
    radio_cobertura_km = models.PositiveIntegerField(default=30)
    velocidad_promedio_kmh = models.PositiveIntegerField(default=30)

    # Capacidad: cuántos servicios simultáneos puede atender sin técnicos registrados
    capacidad_simultanea = models.PositiveIntegerField(default=3)
    calificacion = models.DecimalField(
        max_digits=3,
        decimal_places=2,
        default=Decimal("5.00"),
        validators=[MinValueValidator(0), MaxValueValidator(5)],
    )
    activo = models.BooleanField(default=True)
    disponible = models.BooleanField(
        default=True, help_text="Desmarcar para pausar temporalmente la recepción de servicios."
    )

    creado = models.DateTimeField(auto_now_add=True)
    actualizado = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "proveedor"
        verbose_name_plural = "proveedores"

    def __str__(self):
        return self.nombre


class Tecnico(models.Model):
    """Persona del proveedor que atiende el servicio en sitio."""

    proveedor = models.ForeignKey(Proveedor, on_delete=models.CASCADE, related_name="tecnicos")
    usuario = models.OneToOneField(
        "usuarios.Usuario",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="tecnico",
    )
    nombre = models.CharField(max_length=150)
    telefono = models.CharField(max_length=20)
    documento = models.CharField(max_length=20, blank=True)
    placa_vehiculo = models.CharField(max_length=10, blank=True)
    servicios = models.ManyToManyField(
        TipoServicio,
        blank=True,
        related_name="tecnicos",
        help_text="Si se deja vacío, el técnico atiende todos los servicios del proveedor.",
    )

    # Última ubicación conocida (se actualiza desde la app del técnico)
    latitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitud = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    ubicacion_actualizada = models.DateTimeField(null=True, blank=True)

    disponible = models.BooleanField(default=True)
    activo = models.BooleanField(default=True)

    class Meta:
        ordering = ["nombre"]
        verbose_name = "técnico"
        verbose_name_plural = "técnicos"

    def __str__(self):
        return f"{self.nombre} - {self.proveedor}"

    def atiende(self, tipo_servicio):
        if not self.servicios.exists():
            return self.proveedor.servicios.filter(pk=tipo_servicio.pk).exists()
        return self.servicios.filter(pk=tipo_servicio.pk).exists()
