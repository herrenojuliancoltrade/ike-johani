from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.asistencias.views import (
    AsistenciaViewSet,
    NotificacionViewSet,
    ProveedorAsistenciaViewSet,
)
from apps.polizas.views import PolizaViewSet
from apps.proveedores.views import ProveedorViewSet, TecnicoViewSet, TipoServicioViewSet
from apps.usuarios.views import (
    CambiarPasswordView,
    LoginView,
    LogoutView,
    MeView,
    RegistroView,
    UsuarioAdminViewSet,
)

router = DefaultRouter()
router.register("asistencias", AsistenciaViewSet, basename="asistencia")
router.register("proveedor/asistencias", ProveedorAsistenciaViewSet, basename="proveedor-asistencia")
router.register("notificaciones", NotificacionViewSet, basename="notificacion")
router.register("polizas", PolizaViewSet, basename="poliza")
router.register("tipos-servicio", TipoServicioViewSet, basename="tipo-servicio")
router.register("proveedores", ProveedorViewSet, basename="proveedor")
router.register("tecnicos", TecnicoViewSet, basename="tecnico")
router.register("usuarios", UsuarioAdminViewSet, basename="usuario")

auth_urls = [
    path("registro/", RegistroView.as_view(), name="registro"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("logout/", LogoutView.as_view(), name="logout"),
    path("me/", MeView.as_view(), name="me"),
    path("cambiar-password/", CambiarPasswordView.as_view(), name="cambiar-password"),
]

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/auth/", include(auth_urls)),
    path("api/", include(router.urls)),
    path("api-auth/", include("rest_framework.urls")),  # login en la API navegable
]
