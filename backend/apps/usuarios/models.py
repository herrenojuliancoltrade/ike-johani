from django.contrib.auth.models import AbstractUser, BaseUserManager
from django.db import models


class UsuarioManager(BaseUserManager):
    """Manager que usa el email como identificador de login."""

    use_in_migrations = True

    def _create_user(self, email, password, **extra):
        if not email:
            raise ValueError("El email es obligatorio")
        email = self.normalize_email(email).lower()
        user = self.model(email=email, **extra)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_user(self, email, password=None, **extra):
        extra.setdefault("is_staff", False)
        extra.setdefault("is_superuser", False)
        return self._create_user(email, password, **extra)

    def create_superuser(self, email, password=None, **extra):
        extra.setdefault("is_staff", True)
        extra.setdefault("is_superuser", True)
        extra.setdefault("rol", Usuario.Rol.ADMIN)
        if not extra["is_staff"] or not extra["is_superuser"]:
            raise ValueError("El superusuario debe tener is_staff e is_superuser en True")
        return self._create_user(email, password, **extra)


class Usuario(AbstractUser):
    class Rol(models.TextChoices):
        ASEGURADO = "ASEGURADO", "Asegurado"
        PROVEEDOR = "PROVEEDOR", "Proveedor / Técnico"
        OPERADOR = "OPERADOR", "Operador de la aseguradora"
        ADMIN = "ADMIN", "Administrador"

    class TipoDocumento(models.TextChoices):
        CC = "CC", "Cédula de ciudadanía"
        CE = "CE", "Cédula de extranjería"
        NIT = "NIT", "NIT"
        PA = "PA", "Pasaporte"

    username = None
    email = models.EmailField("email", unique=True)
    rol = models.CharField(max_length=20, choices=Rol.choices, default=Rol.ASEGURADO)
    tipo_documento = models.CharField(
        max_length=5, choices=TipoDocumento.choices, default=TipoDocumento.CC
    )
    documento = models.CharField(max_length=20, blank=True, db_index=True)
    telefono = models.CharField(max_length=20, blank=True)
    # Si el usuario es técnico/operador de un proveedor, se enlaza aquí.
    proveedor = models.ForeignKey(
        "proveedores.Proveedor",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="usuarios",
    )

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = ["first_name", "last_name"]

    objects = UsuarioManager()

    class Meta:
        verbose_name = "usuario"
        verbose_name_plural = "usuarios"

    def __str__(self):
        return f"{self.get_full_name() or self.email} ({self.rol})"

    @property
    def es_asegurado(self):
        return self.rol == self.Rol.ASEGURADO

    @property
    def es_proveedor(self):
        return self.rol == self.Rol.PROVEEDOR

    @property
    def es_staff_aseguradora(self):
        return self.rol in (self.Rol.OPERADOR, self.Rol.ADMIN) or self.is_superuser
