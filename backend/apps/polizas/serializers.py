from rest_framework import serializers

from apps.proveedores.serializers import TipoServicioSerializer

from .models import Poliza


class PolizaSerializer(serializers.ModelSerializer):
    vigente = serializers.BooleanField(read_only=True)
    servicios_cubiertos_detalle = TipoServicioSerializer(
        source="servicios_cubiertos", many=True, read_only=True
    )

    class Meta:
        model = Poliza
        fields = [
            "id",
            "numero",
            "titular_nombre",
            "titular_documento",
            "asegurado",
            "placa",
            "marca",
            "linea",
            "modelo",
            "color",
            "fecha_inicio",
            "fecha_fin",
            "activa",
            "vigente",
            "servicios_cubiertos",
            "servicios_cubiertos_detalle",
            "max_asistencias_anuales",
            "creado",
            "actualizado",
        ]
        read_only_fields = ["creado", "actualizado"]
        extra_kwargs = {"servicios_cubiertos": {"write_only": True}}

    def validate(self, attrs):
        inicio = attrs.get("fecha_inicio", getattr(self.instance, "fecha_inicio", None))
        fin = attrs.get("fecha_fin", getattr(self.instance, "fecha_fin", None))
        if inicio and fin and fin < inicio:
            raise serializers.ValidationError({"fecha_fin": "Debe ser posterior a la fecha de inicio."})
        return attrs


class VincularPolizaSerializer(serializers.Serializer):
    numero_poliza = serializers.CharField(max_length=40)

    def validate(self, attrs):
        usuario = self.context["request"].user
        try:
            poliza = Poliza.objects.get(numero__iexact=attrs["numero_poliza"].strip())
        except Poliza.DoesNotExist:
            raise serializers.ValidationError({"numero_poliza": "La póliza no existe."})
        if poliza.titular_documento != usuario.documento:
            raise serializers.ValidationError(
                {"numero_poliza": "La póliza no pertenece a tu documento."}
            )
        if poliza.asegurado_id and poliza.asegurado_id != usuario.pk:
            raise serializers.ValidationError(
                {"numero_poliza": "La póliza ya está vinculada a otra cuenta."}
            )
        attrs["poliza"] = poliza
        return attrs
