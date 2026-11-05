from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.usuarios.permissions import EsStaffAseguradora

from .models import Proveedor, Tecnico, TipoServicio
from .serializers import (
    ProveedorSerializer,
    TecnicoSerializer,
    TipoServicioSerializer,
    UbicacionSerializer,
)


class TipoServicioViewSet(viewsets.ModelViewSet):
    """Catálogo de servicios. Lectura pública, escritura solo staff."""

    queryset = TipoServicio.objects.all()
    serializer_class = TipoServicioSerializer
    pagination_class = None
    filterset_fields = ["activo", "requiere_desplazamiento"]

    def get_queryset(self):
        qs = super().get_queryset()
        user = self.request.user
        if not (user.is_authenticated and user.es_staff_aseguradora):
            qs = qs.filter(activo=True)
        return qs

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [AllowAny()]
        return [EsStaffAseguradora()]


class ProveedorViewSet(viewsets.ModelViewSet):
    """CRUD de proveedores (solo aseguradora)."""

    queryset = Proveedor.objects.prefetch_related("servicios")
    serializer_class = ProveedorSerializer
    permission_classes = [EsStaffAseguradora]
    filterset_fields = ["activo", "disponible", "ciudad", "servicios"]
    search_fields = ["nombre", "nit", "ciudad"]
    ordering_fields = ["nombre", "calificacion", "creado"]


class TecnicoViewSet(viewsets.ModelViewSet):
    """
    - Staff: todos los técnicos.
    - Usuario proveedor: solo los técnicos de su empresa.
    - Técnico: puede actualizar su ubicación y disponibilidad.
    """

    serializer_class = TecnicoSerializer
    filterset_fields = ["proveedor", "disponible", "activo"]
    search_fields = ["nombre", "documento", "placa_vehiculo"]

    def get_queryset(self):
        qs = Tecnico.objects.select_related("proveedor").prefetch_related("servicios")
        user = self.request.user
        if user.es_staff_aseguradora:
            return qs
        if user.es_proveedor and user.proveedor_id:
            return qs.filter(proveedor_id=user.proveedor_id)
        return qs.none()

    def perform_create(self, serializer):
        user = self.request.user
        if user.es_staff_aseguradora:
            serializer.save()
        elif user.es_proveedor and user.proveedor_id:
            serializer.save(proveedor_id=user.proveedor_id)
        else:
            raise PermissionDenied()

    def perform_update(self, serializer):
        user = self.request.user
        if user.es_proveedor:
            serializer.save(proveedor_id=user.proveedor_id)
        elif user.es_staff_aseguradora:
            serializer.save()
        else:
            raise PermissionDenied()

    def perform_destroy(self, instance):
        if not (self.request.user.es_staff_aseguradora or self.request.user.es_proveedor):
            raise PermissionDenied()
        instance.activo = False
        instance.save(update_fields=["activo"])

    @action(detail=True, methods=["post"])
    def ubicacion(self, request, pk=None):
        """POST /api/tecnicos/{id}/ubicacion/ — actualiza GPS y recalcula ETA."""
        from apps.asistencias.models import ESTADOS_ACTIVOS
        from apps.asistencias.services.asignacion import recalcular_eta_desde_tecnico

        tecnico = self.get_object()
        serializer = UbicacionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tecnico.latitud = serializer.validated_data["latitud"]
        tecnico.longitud = serializer.validated_data["longitud"]
        tecnico.ubicacion_actualizada = timezone.now()
        tecnico.save(update_fields=["latitud", "longitud", "ubicacion_actualizada"])

        for solicitud in tecnico.solicitudes.filter(estado__in=ESTADOS_ACTIVOS).select_related(
            "proveedor", "tipo_servicio"
        ):
            solicitud.tecnico = tecnico
            recalcular_eta_desde_tecnico(solicitud)

        return Response(TecnicoSerializer(tecnico).data)
