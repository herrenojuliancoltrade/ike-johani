from django.contrib.auth import password_validation
from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken

from apps.polizas.models import Poliza

from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    nombre_completo = serializers.CharField(source="get_full_name", read_only=True)
    proveedor_nombre = serializers.CharField(source="proveedor.nombre", read_only=True, default=None)
    tecnico_id = serializers.SerializerMethodField()

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "first_name",
            "last_name",
            "nombre_completo",
            "tipo_documento",
            "documento",
            "telefono",
            "rol",
            "proveedor",
            "proveedor_nombre",
            "tecnico_id",
            "date_joined",
        ]
        read_only_fields = ["id", "email", "rol", "proveedor", "documento", "tipo_documento", "date_joined"]

    def get_tecnico_id(self, obj):
        tecnico = getattr(obj, "tecnico", None)
        return tecnico.pk if tecnico else None


def tokens_para(usuario):
    refresh = RefreshToken.for_user(usuario)
    return {"refresh": str(refresh), "access": str(refresh.access_token)}


class RegistroAseguradoSerializer(serializers.Serializer):
    """
    Registro del asegurado. Debe presentar un número de póliza existente
    cuyo titular coincida con el documento ingresado.
    """

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, style={"input_type": "password"})
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    tipo_documento = serializers.ChoiceField(choices=Usuario.TipoDocumento.choices)
    documento = serializers.CharField(max_length=20)
    telefono = serializers.CharField(max_length=20)
    numero_poliza = serializers.CharField(max_length=40)

    def validate_email(self, value):
        value = value.lower().strip()
        if Usuario.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("Ya existe una cuenta con este email.")
        return value

    def validate(self, attrs):
        documento = attrs["documento"].strip()
        try:
            poliza = Poliza.objects.get(numero__iexact=attrs["numero_poliza"].strip())
        except Poliza.DoesNotExist:
            raise serializers.ValidationError({"numero_poliza": "La póliza no existe."})
        if poliza.titular_documento != documento:
            raise serializers.ValidationError(
                {"numero_poliza": "El documento no coincide con el titular de la póliza."}
            )
        if poliza.asegurado_id:
            raise serializers.ValidationError(
                {"numero_poliza": "La póliza ya está vinculada a otra cuenta."}
            )
        if not poliza.vigente:
            raise serializers.ValidationError({"numero_poliza": "La póliza no está vigente."})

        usuario_tmp = Usuario(
            email=attrs["email"], first_name=attrs["first_name"], last_name=attrs["last_name"]
        )
        password_validation.validate_password(attrs["password"], usuario_tmp)

        attrs["documento"] = documento
        attrs["poliza"] = poliza
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        poliza = validated_data.pop("poliza")
        validated_data.pop("numero_poliza")
        password = validated_data.pop("password")
        usuario = Usuario.objects.create_user(
            password=password, rol=Usuario.Rol.ASEGURADO, **validated_data
        )
        poliza.asegurado = usuario
        poliza.save(update_fields=["asegurado", "actualizado"])
        return usuario


class LoginSerializer(TokenObtainPairSerializer):
    """Login por email + password; devuelve tokens y datos del usuario."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token["rol"] = user.rol
        token["nombre"] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data["usuario"] = UsuarioSerializer(self.user).data
        return data


class CambiarPasswordSerializer(serializers.Serializer):
    password_actual = serializers.CharField(write_only=True)
    password_nuevo = serializers.CharField(write_only=True)

    def validate_password_actual(self, value):
        if not self.context["request"].user.check_password(value):
            raise serializers.ValidationError("La contraseña actual no es correcta.")
        return value

    def validate_password_nuevo(self, value):
        password_validation.validate_password(value, self.context["request"].user)
        return value


class CrearUsuarioStaffSerializer(serializers.ModelSerializer):
    """Para que la aseguradora cree usuarios de proveedores u operadores."""

    password = serializers.CharField(write_only=True)

    class Meta:
        model = Usuario
        fields = [
            "id",
            "email",
            "password",
            "first_name",
            "last_name",
            "tipo_documento",
            "documento",
            "telefono",
            "rol",
            "proveedor",
            "is_active",
        ]

    def validate(self, attrs):
        if attrs.get("rol") == Usuario.Rol.PROVEEDOR and not attrs.get("proveedor"):
            raise serializers.ValidationError({"proveedor": "Obligatorio para usuarios de proveedor."})
        password_validation.validate_password(attrs["password"])
        return attrs

    def create(self, validated_data):
        password = validated_data.pop("password")
        return Usuario.objects.create_user(password=password, **validated_data)


class UsuarioAdminSerializer(UsuarioSerializer):
    """Edición de usuarios por la aseguradora (puede cambiar rol, proveedor, estado)."""

    class Meta(UsuarioSerializer.Meta):
        fields = UsuarioSerializer.Meta.fields + ["is_active"]
        read_only_fields = ["id", "email", "date_joined"]
