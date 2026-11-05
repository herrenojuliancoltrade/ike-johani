from django.contrib import admin

from .models import HistorialEstado, IntentoAsignacion, Notificacion, SolicitudAsistencia


class HistorialInline(admin.TabularInline):
    model = HistorialEstado
    extra = 0
    readonly_fields = ["estado_anterior", "estado_nuevo", "comentario", "usuario", "fecha"]
    can_delete = False


class IntentoInline(admin.TabularInline):
    model = IntentoAsignacion
    extra = 0
    readonly_fields = ["proveedor", "tecnico", "distancia_km", "puntaje", "resultado", "motivo", "fecha"]
    can_delete = False


@admin.register(SolicitudAsistencia)
class SolicitudAsistenciaAdmin(admin.ModelAdmin):
    list_display = ["id", "tipo_servicio", "asegurado", "estado", "proveedor", "tecnico", "eta_minutos", "creado"]
    list_filter = ["estado", "tipo_servicio", "proveedor"]
    search_fields = ["id", "poliza__numero", "asegurado__email", "asegurado__documento"]
    raw_id_fields = ["asegurado", "poliza", "proveedor", "tecnico"]
    readonly_fields = ["codigo", "creado", "actualizado"]
    inlines = [IntentoInline, HistorialInline]


@admin.register(Notificacion)
class NotificacionAdmin(admin.ModelAdmin):
    list_display = ["usuario", "titulo", "solicitud", "leida", "fecha"]
    list_filter = ["leida"]
    search_fields = ["usuario__email", "titulo"]
