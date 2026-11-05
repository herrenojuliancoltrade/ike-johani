from rest_framework import serializers

from .models import Proveedor, Tecnico, TipoServicio


class TipoServicioSerializer(serializers.ModelSerializer):
    class Meta:
        model = TipoServicio
        fields = ["id", "codigo", "nombre", "descripcion", "requiere_desplazamiento", "activo"]


class TecnicoSerializer(serializers.ModelSerializer):
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True)

    class Meta:
        model = Tecnico
        fields = [
            "id",
            "proveedor",
            "proveedor_nombre",
            "usuario",
            "nombre",
            "telefono",
            "documento",
            "placa_vehiculo",
            "servicios",
            "latitud",
            "longitud",
            "ubicacion_actualizada",
            "disponible",
            "activo",
        ]
        read_only_fields = ["ubicacion_actualizada"]


class TecnicoPublicoSerializer(serializers.ModelSerializer):
    """Lo que ve el asegurado del técnico asignado."""

    class Meta:
        model = Tecnico
        fields = ["id", "nombre", "telefono", "placa_vehiculo", "latitud", "longitud", "ubicacion_actualizada"]


class ProveedorSerializer(serializers.ModelSerializer):
    servicios_detalle = TipoServicioSerializer(source="servicios", many=True, read_only=True)
    tecnicos_activos = serializers.SerializerMethodField()

    class Meta:
        model = Proveedor
        fields = [
            "id",
            "nombre",
            "nit",
            "telefono",
            "email",
            "direccion",
            "ciudad",
            "servicios",
            "servicios_detalle",
            "latitud",
            "longitud",
            "radio_cobertura_km",
            "velocidad_promedio_kmh",
            "capacidad_simultanea",
            "calificacion",
            "activo",
            "disponible",
            "tecnicos_activos",
            "creado",
            "actualizado",
        ]
        read_only_fields = ["calificacion", "creado", "actualizado"]
        extra_kwargs = {"servicios": {"write_only": True}}

    def get_tecnicos_activos(self, obj):
        return obj.tecnicos.filter(activo=True).count()


class ProveedorPublicoSerializer(serializers.ModelSerializer):
    """Lo que ve el asegurado del proveedor asignado."""

    class Meta:
        model = Proveedor
        fields = ["id", "nombre", "telefono", "calificacion"]


class UbicacionSerializer(serializers.Serializer):
    latitud = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-90, max_value=90)
    longitud = serializers.DecimalField(max_digits=9, decimal_places=6, min_value=-180, max_value=180)
