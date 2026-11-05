from rest_framework import serializers

from apps.polizas.models import Poliza
from apps.proveedores.models import Tecnico, TipoServicio
from apps.proveedores.serializers import ProveedorPublicoSerializer, TecnicoPublicoSerializer

from .models import (
    EstadoSolicitud,
    HistorialEstado,
    IntentoAsignacion,
    Notificacion,
    SolicitudAsistencia,
)

# Pasos que se muestran en la barra de progreso del seguimiento.
PASOS_SEGUIMIENTO = [
    EstadoSolicitud.PENDIENTE,
    EstadoSolicitud.ASIGNADA,
    EstadoSolicitud.EN_CAMINO,
    EstadoSolicitud.EN_SITIO,
    EstadoSolicitud.EN_PROCESO,
    EstadoSolicitud.FINALIZADA,
]


class HistorialEstadoSerializer(serializers.ModelSerializer):
    estado_nuevo_display = serializers.CharField(source="get_estado_nuevo_display", read_only=True)
    usuario_nombre = serializers.CharField(source="usuario.get_full_name", read_only=True, default=None)

    class Meta:
        model = HistorialEstado
        fields = ["estado_anterior", "estado_nuevo", "estado_nuevo_display", "comentario", "usuario_nombre", "fecha"]


class IntentoAsignacionSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)

    class Meta:
        model = IntentoAsignacion
        fields = ["proveedor", "proveedor_nombre", "tecnico", "distancia_km", "puntaje", "resultado", "motivo", "fecha"]


class CrearSolicitudSerializer(serializers.ModelSerializer):
    """Lo que envía el asegurado para pedir una asistencia."""

    poliza = serializers.PrimaryKeyRelatedField(queryset=Poliza.objects.all(), required=False)
    numero_poliza = serializers.CharField(write_only=True, required=False)
    tipo_servicio = serializers.SlugRelatedField(
        slug_field="codigo", queryset=TipoServicio.objects.filter(activo=True)
    )
    latitud = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-90, max_value=90)
    longitud = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-180, max_value=180)
    telefono_contacto = serializers.CharField(max_length=20, required=False)

    class Meta:
        model = SolicitudAsistencia
        fields = [
            "poliza",
            "numero_poliza",
            "tipo_servicio",
            "descripcion",
            "latitud",
            "longitud",
            "direccion",
            "referencia",
            "telefono_contacto",
            "destino_direccion",
            "destino_latitud",
            "destino_longitud",
        ]

    def validate(self, attrs):
        usuario = self.context["request"].user
        poliza = attrs.get("poliza")
        numero = attrs.pop("numero_poliza", None)

        if poliza is None and numero:
            poliza = Poliza.objects.filter(numero__iexact=numero.strip()).first()
        if poliza is None:
            # Si el asegurado tiene una sola póliza vigente, se usa por defecto.
            vigentes = [p for p in usuario.polizas.all() if p.vigente]
            if len(vigentes) == 1:
                poliza = vigentes[0]
        if poliza is None:
            raise serializers.ValidationError({"poliza": "Debes indicar la póliza (id o número)."})
        if poliza.asegurado_id != usuario.pk:
            raise serializers.ValidationError({"poliza": "La póliza no pertenece a tu cuenta."})

        errores = poliza.validar_para_servicio(attrs["tipo_servicio"])
        if errores:
            raise serializers.ValidationError({"poliza": errores})

        activa = SolicitudAsistencia.objects.filter(
            poliza=poliza,
            tipo_servicio=attrs["tipo_servicio"],
            estado__in=[
                EstadoSolicitud.PENDIENTE,
                EstadoSolicitud.SIN_PROVEEDOR,
                EstadoSolicitud.ASIGNADA,
                EstadoSolicitud.EN_CAMINO,
                EstadoSolicitud.EN_SITIO,
                EstadoSolicitud.EN_PROCESO,
            ],
        ).first()
        if activa:
            raise serializers.ValidationError(
                f"Ya tienes una solicitud activa (#{activa.pk}) de este servicio para esta póliza."
            )

        if attrs["tipo_servicio"].codigo == "GRUA" and not attrs.get("destino_direccion"):
            raise serializers.ValidationError(
                {"destino_direccion": "Indica a dónde se debe trasladar el vehículo."}
            )

        attrs["poliza"] = poliza
        attrs.setdefault("telefono_contacto", usuario.telefono)
        if not attrs.get("telefono_contacto"):
            raise serializers.ValidationError({"telefono_contacto": "Indica un teléfono de contacto."})
        return attrs


class SolicitudSerializer(serializers.ModelSerializer):
    """Detalle de la solicitud para el asegurado."""

    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    tipo_servicio = serializers.CharField(source="tipo_servicio.codigo", read_only=True)
    tipo_servicio_nombre = serializers.CharField(source="tipo_servicio.nombre", read_only=True)
    poliza_numero = serializers.CharField(source="poliza.numero", read_only=True)
    proveedor = ProveedorPublicoSerializer(read_only=True)
    tecnico = TecnicoPublicoSerializer(read_only=True)

    class Meta:
        model = SolicitudAsistencia
        fields = [
            "id",
            "codigo",
            "poliza",
            "poliza_numero",
            "tipo_servicio",
            "tipo_servicio_nombre",
            "descripcion",
            "latitud",
            "longitud",
            "direccion",
            "referencia",
            "telefono_contacto",
            "destino_direccion",
            "destino_latitud",
            "destino_longitud",
            "estado",
            "estado_display",
            "proveedor",
            "tecnico",
            "distancia_km",
            "eta_minutos",
            "hora_estimada_llegada",
            "creado",
            "actualizado",
            "asignado_en",
            "llegada_en",
            "finalizado_en",
            "cancelado_en",
            "motivo_cancelacion",
            "observaciones_cierre",
            "calificacion",
            "comentario_calificacion",
        ]
        read_only_fields = fields


class SolicitudGestionSerializer(SolicitudSerializer):
    """Vista ampliada para proveedores y la aseguradora."""

    asegurado_nombre = serializers.CharField(source="asegurado.get_full_name", read_only=True)
    asegurado_documento = serializers.CharField(source="asegurado.documento", read_only=True)
    vehiculo = serializers.SerializerMethodField()
    intentos = IntentoAsignacionSerializer(many=True, read_only=True)

    class Meta(SolicitudSerializer.Meta):
        fields = SolicitudSerializer.Meta.fields + [
            "asegurado",
            "asegurado_nombre",
            "asegurado_documento",
            "vehiculo",
            "intentos",
        ]
        read_only_fields = fields

    def get_vehiculo(self, obj):
        p = obj.poliza
        return {"placa": p.placa, "marca": p.marca, "linea": p.linea, "modelo": p.modelo, "color": p.color}


class SeguimientoSerializer(serializers.ModelSerializer):
    """Respuesta compacta para consultar el estado en tiempo real (polling)."""

    estado_display = serializers.CharField(source="get_estado_display", read_only=True)
    proveedor = ProveedorPublicoSerializer(read_only=True)
    tecnico = TecnicoPublicoSerializer(read_only=True)
    historial = HistorialEstadoSerializer(many=True, read_only=True)
    pasos = serializers.SerializerMethodField()

    class Meta:
        model = SolicitudAsistencia
        fields = [
            "id",
            "codigo",
            "estado",
            "estado_display",
            "proveedor",
            "tecnico",
            "distancia_km",
            "eta_minutos",
            "hora_estimada_llegada",
            "actualizado",
            "pasos",
            "historial",
        ]

    def get_pasos(self, obj):
        alcanzados = {h.estado_nuevo for h in obj.historial.all()} | {EstadoSolicitud.PENDIENTE}
        return [
            {
                "estado": paso.value,
                "nombre": paso.label,
                "completado": paso in alcanzados,
                "actual": paso == obj.estado,
            }
            for paso in PASOS_SEGUIMIENTO
        ]


class CancelarSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=255)


class CalificarSerializer(serializers.Serializer):
    calificacion = serializers.IntegerField(min_value=1, max_value=5)
    comentario = serializers.CharField(required=False, allow_blank=True)


class CambiarEstadoSerializer(serializers.Serializer):
    ESTADOS_PROVEEDOR = [
        EstadoSolicitud.EN_CAMINO,
        EstadoSolicitud.EN_SITIO,
        EstadoSolicitud.EN_PROCESO,
        EstadoSolicitud.FINALIZADA,
    ]
    estado = serializers.ChoiceField(choices=[(e.value, e.label) for e in ESTADOS_PROVEEDOR])
    comentario = serializers.CharField(required=False, allow_blank=True, max_length=255)


class RechazarSerializer(serializers.Serializer):
    motivo = serializers.CharField(max_length=255)


class AsignarTecnicoSerializer(serializers.Serializer):
    tecnico = serializers.PrimaryKeyRelatedField(queryset=Tecnico.objects.filter(activo=True))


class NotificacionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notificacion
        fields = ["id", "solicitud", "titulo", "mensaje", "leida", "fecha"]
        read_only_fields = ["id", "solicitud", "titulo", "mensaje", "fecha"]
