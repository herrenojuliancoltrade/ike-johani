from rest_framework.permissions import SAFE_METHODS, BasePermission


class EsAsegurado(BasePermission):
    message = "Solo los asegurados pueden realizar esta acción."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.es_asegurado)


class EsProveedor(BasePermission):
    message = "Solo los usuarios de proveedores pueden realizar esta acción."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.es_proveedor and u.proveedor_id)


class EsStaffAseguradora(BasePermission):
    message = "Solo operadores o administradores de la aseguradora."

    def has_permission(self, request, view):
        u = request.user
        return bool(u and u.is_authenticated and u.es_staff_aseguradora)


class LecturaAutenticadoEscrituraStaff(BasePermission):
    """GET para cualquier usuario autenticado; escritura solo staff."""

    def has_permission(self, request, view):
        u = request.user
        if not (u and u.is_authenticated):
            return False
        return request.method in SAFE_METHODS or u.es_staff_aseguradora
