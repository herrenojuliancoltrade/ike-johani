from django.db import transaction
from django.db.models import Avg
from rest_framework import mixins, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response

from apps.proveedores.models import Tecnico
from apps.usuarios.permissions import EsProveedor, EsStaffAseguradora

from .models import (
    ESTADOS_ACTIVOS,
    ESTADOS_CANCELABLES_POR_ASEGURADO,
    EstadoSolicitud,
    HistorialEstado,
    IntentoAsignacion,
    Notificacion,
    SolicitudAsistencia,
)
from .serializers import (
    AsignarTecnicoSerializer,
    CalificarSerializer,
    CambiarEstadoSerializer,
    CancelarSerializer,
    CrearSolicitudSerializer,
    NotificacionSerializer,
    RechazarSerializer,
    SeguimientoSerializer,
    SolicitudGestionSerializer,
    SolicitudSerializer,
)
from .services.asignacion import (
    asignar_proveedor,
    buscar_candidatos,
    liberar_y_reasignar,
    recalcular_eta_desde_tecnico,
)
from .services.estados import TransicionInvalida, cambiar_estado


def _base_qs():
    return SolicitudAsistencia.objects.select_related(
        "asegurado", "poliza", "tipo_servicio", "proveedor", "tecnico"
    )


def _transicion(func, *args, **kwargs):
    try:
        return func(*args, **kwargs)
    except TransicionInvalida as exc:
        raise ValidationError({"estado": str(exc)})


class AsistenciaViewSet(
    mixins.CreateModelMixin,
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    viewsets.GenericViewSet,
):
    """
    Solicitudes de asistencia.

    - Asegurado: crea y consulta sus solicitudes, hace seguimiento, cancela y califica.
    - Operador/Admin: ve todas, puede reintentar, reasignar y ver candidatos.
    """

    filterset_fields = ["estado", "tipo_servicio__codigo", "poliza", "proveedor"]
    search_fields = ["descripcion", "direccion", "poliza__numero", "asegurado__documento"]
    ordering_fields = ["creado", "actualizado", "estado"]

    def get_queryset(self):
        user = self.request.user
        qs = _base_qs()
        if user.es_staff_aseguradora:
            return qs.prefetch_related("intentos__proveedor")
        if user.es_asegurado:
            return qs.filter(asegurado=user)
        return qs.none()

    def get_serializer_class(self):
        if self.action == "create":
            return CrearSolicitudSerializer
        if self.request.user.es_staff_aseguradora:
            return SolicitudGestionSerializer
        return SolicitudSerializer

    def get_permissions(self):
        if self.action in ("reasignar", "candidatos"):
            return [EsStaffAseguradora()]
        return super().get_permissions()

    def create(self, request, *args, **kwargs):
        if not request.user.es_asegurado:
            raise PermissionDenied("Solo los asegurados pueden solicitar asistencias.")
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            solicitud = serializer.save(asegurado=request.user)
            HistorialEstado.objects.create(
                solicitud=solicitud,
                estado_nuevo=EstadoSolicitud.PENDIENTE,
                comentario="Solicitud creada por el asegurado.",
                usuario=request.user,
            )
        # Paso 3 y 4: búsqueda y asignación automática del proveedor.
        solicitud = asignar_proveedor(solicitud, usuario=None)
        solicitud = _base_qs().get(pk=solicitud.pk)
        return Response(SolicitudSerializer(solicitud).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=["get"])
    def seguimiento(self, request, pk=None):
        """GET /api/asistencias/{id}/seguimiento/ — estado en tiempo real."""
        solicitud = self.get_object()
        return Response(SeguimientoSerializer(solicitud).data)

    @action(detail=False, methods=["get"])
    def activas(self, request):
        """GET /api/asistencias/activas/ — solicitudes en curso del usuario."""
        qs = self.filter_queryset(self.get_queryset()).exclude(
            estado__in=[EstadoSolicitud.FINALIZADA, EstadoSolicitud.CANCELADA]
        )
        return Response(self.get_serializer(qs, many=True).data)

    @action(detail=True, methods=["post"])
    def cancelar(self, request, pk=None):
        solicitud = self.get_object()
        serializer = CancelarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if (
            request.user.es_asegurado
            and solicitud.estado not in ESTADOS_CANCELABLES_POR_ASEGURADO
        ):
            raise ValidationError(
                {"estado": "El servicio ya está en atención y no se puede cancelar."}
            )
        _transicion(
            cambiar_estado,
            solicitud,
            EstadoSolicitud.CANCELADA,
            usuario=request.user,
            comentario=serializer.validated_data["motivo"],
        )
        return Response(SolicitudSerializer(solicitud).data)

    @action(detail=True, methods=["post"])
    def calificar(self, request, pk=None):
        solicitud = self.get_object()
        if solicitud.asegurado_id != request.user.pk:
            raise PermissionDenied("Solo el asegurado puede calificar el servicio.")
        if solicitud.estado != EstadoSolicitud.FINALIZADA:
            raise ValidationError({"estado": "Solo se pueden calificar servicios finalizados."})
        if solicitud.calificacion:
            raise ValidationError({"calificacion": "Este servicio ya fue calificado."})

        serializer = CalificarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud.calificacion = serializer.validated_data["calificacion"]
        solicitud.comentario_calificacion = serializer.validated_data.get("comentario", "")
        solicitud.save(update_fields=["calificacion", "comentario_calificacion", "actualizado"])

        if solicitud.proveedor:
            promedio = solicitud.proveedor.solicitudes.filter(
                calificacion__isnull=False
            ).aggregate(p=Avg("calificacion"))["p"]
            solicitud.proveedor.calificacion = round(promedio, 2)
            solicitud.proveedor.save(update_fields=["calificacion"])
        return Response(SolicitudSerializer(solicitud).data)

    @action(detail=True, methods=["post"])
    def reintentar(self, request, pk=None):
        """Vuelve a buscar proveedor para una solicitud SIN_PROVEEDOR."""
        solicitud = self.get_object()
        if solicitud.estado != EstadoSolicitud.SIN_PROVEEDOR:
            raise ValidationError({"estado": "Solo aplica a solicitudes sin proveedor."})
        solicitud = _transicion(asignar_proveedor, solicitud, usuario=request.user)
        return Response(self.get_serializer(_base_qs().get(pk=solicitud.pk)).data)

    @action(detail=True, methods=["post"])
    def reasignar(self, request, pk=None):
        """(Staff) Quita el proveedor actual y asigna el siguiente mejor."""
        solicitud = self.get_object()
        motivo = request.data.get("motivo", "Reasignado por la aseguradora")
        solicitud = _transicion(
            liberar_y_reasignar,
            solicitud,
            IntentoAsignacion.Resultado.REASIGNADO,
            motivo=motivo,
            usuario=request.user,
        )
        return Response(SolicitudGestionSerializer(_base_qs().get(pk=solicitud.pk)).data)

    @action(detail=True, methods=["get"])
    def candidatos(self, request, pk=None):
        """(Staff) Muestra el ranking de proveedores que podrían atender la solicitud."""
        solicitud = self.get_object()
        return Response([c.como_dict() for c in buscar_candidatos(solicitud)])


class ProveedorAsistenciaViewSet(
    mixins.ListModelMixin, mixins.RetrieveModelMixin, viewsets.GenericViewSet
):
    """Panel del proveedor: servicios asignados a su empresa."""

    serializer_class = SolicitudGestionSerializer
    permission_classes = [EsProveedor]
    filterset_fields = ["estado", "tipo_servicio__codigo", "tecnico"]
    ordering_fields = ["creado", "actualizado"]

    def get_queryset(self):
        user = self.request.user
        qs = _base_qs().filter(proveedor_id=user.proveedor_id).prefetch_related("intentos__proveedor")
        # Si el usuario es un técnico, solo ve lo que le asignaron a él.
        tecnico = getattr(user, "tecnico", None)
        if tecnico is not None:
            qs = qs.filter(tecnico=tecnico)
        return qs

    @action(detail=False, methods=["get"])
    def activas(self, request):
        """GET /api/proveedor/asistencias/activas/ — servicios en curso (sin paginar)."""
        qs = self.filter_queryset(self.get_queryset()).filter(estado__in=ESTADOS_ACTIVOS)
        return Response(self.get_serializer(qs, many=True).data)

    def _respuesta(self, solicitud):
        return Response(self.get_serializer(_base_qs().get(pk=solicitud.pk)).data)

    @action(detail=True, methods=["post"], url_path="cambiar-estado")
    def cambiar_estado(self, request, pk=None):
        """EN_CAMINO -> EN_SITIO -> EN_PROCESO -> FINALIZADA."""
        solicitud = self.get_object()
        serializer = CambiarEstadoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nuevo = serializer.validated_data["estado"]

        if (
            nuevo == EstadoSolicitud.EN_PROCESO
            and solicitud.estado == EstadoSolicitud.ASIGNADA
            and solicitud.tipo_servicio.requiere_desplazamiento
        ):
            raise ValidationError({"estado": "Este servicio requiere que el técnico llegue al sitio primero."})

        _transicion(
            cambiar_estado,
            solicitud,
            nuevo,
            usuario=request.user,
            comentario=serializer.validated_data.get("comentario", ""),
        )
        if nuevo == EstadoSolicitud.EN_CAMINO:
            recalcular_eta_desde_tecnico(solicitud)
        return self._respuesta(solicitud)

    @action(detail=True, methods=["post"])
    def rechazar(self, request, pk=None):
        """El proveedor no puede atender: se busca automáticamente el siguiente."""
        solicitud = self.get_object()
        serializer = RechazarSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        solicitud = _transicion(
            liberar_y_reasignar,
            solicitud,
            IntentoAsignacion.Resultado.RECHAZADO,
            motivo=serializer.validated_data["motivo"],
            usuario=request.user,
        )
        return Response({"detail": "Servicio rechazado y reasignado.", "estado": solicitud.estado})

    @action(detail=True, methods=["post"], url_path="asignar-tecnico")
    def asignar_tecnico(self, request, pk=None):
        """Cambia el técnico asignado por otro de la misma empresa."""
        solicitud = self.get_object()
        if solicitud.estado not in (EstadoSolicitud.ASIGNADA, EstadoSolicitud.EN_CAMINO):
            raise ValidationError({"estado": "Solo se puede cambiar el técnico antes de llegar al sitio."})
        serializer = AsignarTecnicoSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        nuevo = serializer.validated_data["tecnico"]
        if nuevo.proveedor_id != request.user.proveedor_id:
            raise ValidationError({"tecnico": "El técnico no pertenece a tu empresa."})

        with transaction.atomic():
            if nuevo.pk != solicitud.tecnico_id:
                tomado = Tecnico.objects.filter(pk=nuevo.pk, disponible=True).update(disponible=False)
                if not tomado:
                    raise ValidationError({"tecnico": "El técnico no está disponible."})
                if solicitud.tecnico:
                    Tecnico.objects.filter(pk=solicitud.tecnico_id).update(disponible=True)
                nuevo.refresh_from_db()
                solicitud.tecnico = nuevo
                solicitud.save(update_fields=["tecnico", "actualizado"])
                HistorialEstado.objects.create(
                    solicitud=solicitud,
                    estado_anterior=solicitud.estado,
                    estado_nuevo=solicitud.estado,
                    comentario=f"Técnico asignado: {nuevo.nombre}",
                    usuario=request.user,
                )
        recalcular_eta_desde_tecnico(solicitud)
        return self._respuesta(solicitud)


class NotificacionViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    serializer_class = NotificacionSerializer
    filterset_fields = ["leida", "solicitud"]

    def get_queryset(self):
        return Notificacion.objects.filter(usuario=self.request.user)

    @action(detail=False, methods=["get"], url_path="no-leidas")
    def no_leidas(self, request):
        return Response({"total": self.get_queryset().filter(leida=False).count()})

    @action(detail=True, methods=["post"], url_path="marcar-leida")
    def marcar_leida(self, request, pk=None):
        notificacion = self.get_object()
        notificacion.leida = True
        notificacion.save(update_fields=["leida"])
        return Response(self.get_serializer(notificacion).data)

    @action(detail=False, methods=["post"], url_path="marcar-todas-leidas")
    def marcar_todas_leidas(self, request):
        total = self.get_queryset().filter(leida=False).update(leida=True)
        return Response({"actualizadas": total})
