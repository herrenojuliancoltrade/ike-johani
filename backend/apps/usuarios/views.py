from rest_framework import generics, mixins, status, viewsets
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView

from .models import Usuario
from .permissions import EsStaffAseguradora
from .serializers import (
    CambiarPasswordSerializer,
    CrearUsuarioStaffSerializer,
    LoginSerializer,
    RegistroAseguradoSerializer,
    UsuarioAdminSerializer,
    UsuarioSerializer,
    tokens_para,
)


class RegistroView(generics.GenericAPIView):
    """POST /api/auth/registro/ — registro de asegurados con su póliza."""

    permission_classes = [AllowAny]
    serializer_class = RegistroAseguradoSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        usuario = serializer.save()
        return Response(
            {"usuario": UsuarioSerializer(usuario).data, **tokens_para(usuario)},
            status=status.HTTP_201_CREATED,
        )


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — {email, password} -> {access, refresh, usuario}."""

    serializer_class = LoginSerializer


class LogoutView(APIView):
    """POST /api/auth/logout/ — invalida el refresh token."""

    def post(self, request):
        try:
            RefreshToken(request.data.get("refresh")).blacklist()
        except (TokenError, TypeError):
            return Response({"detail": "Token inválido."}, status=status.HTTP_400_BAD_REQUEST)
        return Response(status=status.HTTP_205_RESET_CONTENT)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — perfil del usuario autenticado."""

    serializer_class = UsuarioSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class CambiarPasswordView(generics.GenericAPIView):
    serializer_class = CambiarPasswordSerializer

    def post(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data["password_nuevo"])
        request.user.save(update_fields=["password"])
        return Response({"detail": "Contraseña actualizada."})


class UsuarioAdminViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Gestión de usuarios por parte de la aseguradora."""

    queryset = Usuario.objects.select_related("proveedor").order_by("-date_joined")
    permission_classes = [EsStaffAseguradora]
    filterset_fields = ["rol", "is_active", "proveedor"]
    search_fields = ["email", "first_name", "last_name", "documento"]

    def get_serializer_class(self):
        if self.action == "create":
            return CrearUsuarioStaffSerializer
        return UsuarioAdminSerializer
