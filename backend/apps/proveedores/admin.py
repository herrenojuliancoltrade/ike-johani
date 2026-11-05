from django.contrib import admin

from .models import Proveedor, Tecnico, TipoServicio


@admin.register(TipoServicio)
class TipoServicioAdmin(admin.ModelAdmin):
    list_display = ["codigo", "nombre", "requiere_desplazamiento", "activo"]
    list_filter = ["activo", "requiere_desplazamiento"]


class TecnicoInline(admin.TabularInline):
    model = Tecnico
    extra = 0
    fields = ["nombre", "telefono", "placa_vehiculo", "disponible", "activo"]


@admin.register(Proveedor)
class ProveedorAdmin(admin.ModelAdmin):
    list_display = ["nombre", "nit", "ciudad", "telefono", "radio_cobertura_km", "calificacion", "activo", "disponible"]
    list_filter = ["activo", "disponible", "ciudad", "servicios"]
    search_fields = ["nombre", "nit"]
    filter_horizontal = ["servicios"]
    inlines = [TecnicoInline]


@admin.register(Tecnico)
class TecnicoAdmin(admin.ModelAdmin):
    list_display = ["nombre", "proveedor", "telefono", "placa_vehiculo", "disponible", "activo"]
    list_filter = ["disponible", "activo", "proveedor"]
    search_fields = ["nombre", "documento", "placa_vehiculo"]
    filter_horizontal = ["servicios"]
    raw_id_fields = ["usuario"]
