"""
Carga datos de prueba: tipos de servicio, proveedores en Bogotá, técnicos,
pólizas y usuarios de cada rol.

    python manage.py cargar_datos_demo

Contraseña de todos los usuarios demo: Demo12345*
"""

from datetime import date, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction

from apps.polizas.models import Poliza
from apps.proveedores.models import Proveedor, Tecnico, TipoServicio
from apps.usuarios.models import Usuario

PASSWORD = "Demo12345*"

TIPOS = [
    ("GRUA", "Servicio de grúa", "Traslado del vehículo por avería o accidente.", True),
    ("CARRO_TALLER", "Carro taller", "Asistencia mecánica en el lugar donde se encuentre el vehículo.", True),
    ("LEGAL", "Asistencia legal", "Orientación y acompañamiento jurídico.", False),
    ("CERRAJERIA", "Cerrajería", "Apertura del vehículo por llaves dentro o pérdida.", True),
    ("PASO_CORRIENTE", "Paso de corriente", "Arranque por batería descargada.", True),
    ("CAMBIO_LLANTA", "Cambio de llanta", "Cambio de llanta pinchada por el repuesto.", True),
    ("COMBUSTIBLE", "Envío de combustible", "Suministro de combustible por quedarse varado.", True),
    ("OTRA", "Otra asistencia", "Otros servicios contemplados en la póliza.", True),
]

PROVEEDORES = [
    # nombre, nit, tel, lat, lon, radio, servicios, técnicos
    ("Grúas El Dorado SAS", "900100001-1", "6017000001", "4.6762", "-74.1186", 40,
     ["GRUA"], [("Carlos Pérez", "3001112233", "ABC123", "4.6700", "-74.1100"),
                ("Andrés Gómez", "3001112234", "DEF456", "4.6400", "-74.0900")]),
    ("Grúas del Norte", "900100002-2", "6017000002", "4.7550", "-74.0450", 35,
     ["GRUA", "COMBUSTIBLE"], [("Luis Rodríguez", "3002223344", "GHI789", "4.7500", "-74.0500")]),
    ("Taller Móvil Express", "900100003-3", "6017000003", "4.6097", "-74.0817", 25,
     ["CARRO_TALLER", "PASO_CORRIENTE", "CAMBIO_LLANTA", "CERRAJERIA"],
     [("Jorge Martínez", "3003334455", "JKL012", "4.6100", "-74.0800"),
      ("Diana López", "3003334456", "MNO345", "4.6500", "-74.0600")]),
    ("Mecánicos a Domicilio Sur", "900100004-4", "6017000004", "4.5700", "-74.1300", 20,
     ["CARRO_TALLER", "PASO_CORRIENTE", "CAMBIO_LLANTA"], []),
    ("Abogados Viales Asociados", "900100005-5", "6017000005", "4.6650", "-74.0530", 500,
     ["LEGAL"], [("Dra. Paula Sánchez", "3005556677", "", None, None)]),
]


class Command(BaseCommand):
    help = "Carga datos de demostración."

    @transaction.atomic
    def handle(self, *args, **opts):
        tipos = {}
        for codigo, nombre, desc, desplaz in TIPOS:
            tipos[codigo], _ = TipoServicio.objects.update_or_create(
                codigo=codigo,
                defaults={"nombre": nombre, "descripcion": desc, "requiere_desplazamiento": desplaz},
            )

        primer_proveedor = None
        primer_tecnico = None
        for nombre, nit, tel, lat, lon, radio, servicios, tecnicos in PROVEEDORES:
            prov, _ = Proveedor.objects.update_or_create(
                nit=nit,
                defaults={
                    "nombre": nombre,
                    "telefono": tel,
                    "ciudad": "Bogotá",
                    "latitud": Decimal(lat),
                    "longitud": Decimal(lon),
                    "radio_cobertura_km": radio,
                },
            )
            prov.servicios.set([tipos[c] for c in servicios])
            primer_proveedor = primer_proveedor or prov
            for t_nombre, t_tel, placa, t_lat, t_lon in tecnicos:
                tec, _ = Tecnico.objects.update_or_create(
                    proveedor=prov,
                    nombre=t_nombre,
                    defaults={
                        "telefono": t_tel,
                        "placa_vehiculo": placa,
                        "latitud": Decimal(t_lat) if t_lat else None,
                        "longitud": Decimal(t_lon) if t_lon else None,
                        "disponible": True,
                        "activo": True,
                    },
                )
                primer_tecnico = primer_tecnico or tec

        def usuario(email, nombre, apellido, rol, **extra):
            u, creado = Usuario.objects.get_or_create(
                email=email,
                defaults={"first_name": nombre, "last_name": apellido, "rol": rol, **extra},
            )
            if creado:
                u.set_password(PASSWORD)
                u.save()
            return u

        admin = usuario("admin@ike.com", "Admin", "IKE", Usuario.Rol.ADMIN, is_staff=True, is_superuser=True)
        usuario("operador@ike.com", "Olga", "Operadora", Usuario.Rol.OPERADOR, is_staff=True)
        usuario(
            "proveedor@gruaseldorado.com", "Gestor", "El Dorado", Usuario.Rol.PROVEEDOR,
            proveedor=primer_proveedor, telefono="6017000001",
        )
        tec_user = usuario(
            "tecnico@gruaseldorado.com", "Carlos", "Pérez", Usuario.Rol.PROVEEDOR,
            proveedor=primer_proveedor, telefono="3001112233",
        )
        if primer_tecnico and not primer_tecnico.usuario_id:
            primer_tecnico.usuario = tec_user
            primer_tecnico.save(update_fields=["usuario"])

        asegurado = usuario(
            "asegurado@demo.com", "María", "García", Usuario.Rol.ASEGURADO,
            documento="1010101010", telefono="3109998877",
        )

        hoy = date.today()
        todos = list(tipos.values())
        polizas = [
            ("POL-0001", "María García", "1010101010", "XYZ987", asegurado),
            ("POL-0002", "Pedro Ramírez", "2020202020", "KLM321", None),
            ("POL-0003", "Laura Torres", "3030303030", "QRS654", None),
        ]
        for numero, titular, doc, placa, aseg in polizas:
            pol, _ = Poliza.objects.update_or_create(
                numero=numero,
                defaults={
                    "titular_nombre": titular,
                    "titular_documento": doc,
                    "placa": placa,
                    "marca": "Chevrolet",
                    "linea": "Onix",
                    "modelo": 2023,
                    "fecha_inicio": hoy - timedelta(days=30),
                    "fecha_fin": hoy + timedelta(days=335),
                    "activa": True,
                },
            )
            if aseg and not pol.asegurado_id:
                pol.asegurado = aseg
                pol.save(update_fields=["asegurado"])
            pol.servicios_cubiertos.set(todos)

        self.stdout.write(self.style.SUCCESS("Datos demo cargados."))
        self.stdout.write(f"  Contraseña de todos los usuarios: {PASSWORD}")
        self.stdout.write(f"  Admin:      {admin.email}")
        self.stdout.write("  Operador:   operador@ike.com")
        self.stdout.write("  Asegurado:  asegurado@demo.com  (póliza POL-0001)")
        self.stdout.write("  Proveedor:  proveedor@gruaseldorado.com")
        self.stdout.write("  Técnico:    tecnico@gruaseldorado.com")
        self.stdout.write("  Pólizas libres para probar registro: POL-0002 (doc 2020202020), POL-0003 (doc 3030303030)")
