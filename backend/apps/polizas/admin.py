from django.contrib import admin

from .models import Poliza


@admin.register(Poliza)
class PolizaAdmin(admin.ModelAdmin):
    list_display = ["numero", "titular_nombre", "titular_documento", "placa", "fecha_fin", "activa", "asegurado"]
    list_filter = ["activa", "servicios_cubiertos"]
    search_fields = ["numero", "titular_nombre", "titular_documento", "placa"]
    filter_horizontal = ["servicios_cubiertos"]
    raw_id_fields = ["asegurado"]
