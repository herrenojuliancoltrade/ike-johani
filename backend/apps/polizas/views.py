from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.usuarios.permissions import EsAsegurado, EsStaffAseguradora

from .models import Poliza
from .serializers import PolizaSerializer, VincularPolizaSerializer


class PolizaViewSet(viewsets.ModelViewSet):
    """
    - Asegurado: solo ve sus pólizas (lectura) y puede vincular nuevas.
    - Operador/Admin: CRUD completo.
    """

    serializer_class = PolizaSerializer
    filterset_fields = ["activa", "asegurado"]
    search_fields = ["numero", "titular_nombre", "titular_documento", "placa"]
    ordering_fields = ["fecha_fin", "creado"]

    def get_queryset(self):
        qs = Poliza.objects.prefetch_related("servicios_cubiertos")
        user = self.request.user
        if user.es_staff_aseguradora:
            return qs
        if user.es_asegurado:
            return qs.filter(asegurado=user)
        return qs.none()

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return super().get_permissions()
        if self.action == "vincular":
            return [EsAsegurado()]
        return [EsStaffAseguradora()]

    @action(detail=False, methods=["post"])
    def vincular(self, request):
        """POST /api/polizas/vincular/ — vincula otra póliza al asegurado."""
        serializer = VincularPolizaSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        poliza = serializer.validated_data["poliza"]
        poliza.asegurado = request.user
        poliza.save(update_fields=["asegurado", "actualizado"])
        return Response(PolizaSerializer(poliza).data, status=status.HTTP_200_OK)
