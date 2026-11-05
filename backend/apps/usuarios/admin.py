from django.contrib import admin
from django.contrib.auth.admin import UserAdmin

from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(UserAdmin):
    ordering = ["-date_joined"]
    list_display = ["email", "first_name", "last_name", "rol", "documento", "proveedor", "is_active"]
    list_filter = ["rol", "is_active", "is_staff"]
    search_fields = ["email", "first_name", "last_name", "documento"]
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Datos personales", {"fields": ("first_name", "last_name", "tipo_documento", "documento", "telefono")}),
        ("Rol", {"fields": ("rol", "proveedor")}),
        ("Permisos", {"fields": ("is_active", "is_staff", "is_superuser", "groups", "user_permissions")}),
        ("Fechas", {"fields": ("last_login", "date_joined")}),
    )
    add_fieldsets = (
        (
            None,
            {
                "classes": ("wide",),
                "fields": ("email", "first_name", "last_name", "rol", "password1", "password2"),
            },
        ),
    )
