import io
from datetime import date, timedelta
from decimal import Decimal

from django.core.management import call_command
from rest_framework.test import APITestCase

from apps.polizas.models import Poliza
from apps.proveedores.models import Proveedor, Tecnico, TipoServicio
from apps.usuarios.models import Usuario

from .models import EstadoSolicitud, Notificacion, SolicitudAsistencia
from .services.geo import distancia_km

PASSWORD = "Demo12345*"
# Calle 26 con Av. Boyacá, Bogotá
UBICACION = {"latitud": "4.660000", "longitud": "-74.110000"}


class GeoTests(APITestCase):
    def test_distancia_haversine(self):
        # Bogotá -> Medellín ~ 240 km en línea recta
        d = distancia_km(4.7110, -74.0721, 6.2442, -75.5812)
        self.assertAlmostEqual(d, 240, delta=10)


class FlujoAsistenciaTests(APITestCase):
    def setUp(self):
        call_command("cargar_datos_demo", stdout=io.StringIO())
        self.asegurado = Usuario.objects.get(email="asegurado@demo.com")
        self.tecnico_user = Usuario.objects.get(email="tecnico@gruaseldorado.com")

    def login(self, email):
        r = self.client.post("/api/auth/login/", {"email": email, "password": PASSWORD})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertIn("usuario", r.data)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")

    def crear_grua(self):
        return self.client.post(
            "/api/asistencias/",
            {
                "tipo_servicio": "GRUA",
                "descripcion": "El carro no enciende después de un choque leve.",
                "direccion": "Av. Calle 26 # 70-10",
                "destino_direccion": "Taller Chevrolet Calle 13",
                **UBICACION,
            },
        )

    def test_registro_con_poliza(self):
        r = self.client.post(
            "/api/auth/registro/",
            {
                "email": "pedro@demo.com",
                "password": "ClaveSegura2026!",
                "first_name": "Pedro",
                "last_name": "Ramírez",
                "tipo_documento": "CC",
                "documento": "2020202020",
                "telefono": "3000000000",
                "numero_poliza": "POL-0002",
            },
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertIn("access", r.data)
        self.assertEqual(Poliza.objects.get(numero="POL-0002").asegurado.email, "pedro@demo.com")

    def test_registro_documento_no_coincide(self):
        r = self.client.post(
            "/api/auth/registro/",
            {
                "email": "x@demo.com",
                "password": "ClaveSegura2026!",
                "first_name": "X",
                "last_name": "Y",
                "tipo_documento": "CC",
                "documento": "999",
                "telefono": "3000000000",
                "numero_poliza": "POL-0003",
            },
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("numero_poliza", r.data)

    def test_requiere_login(self):
        self.assertEqual(self.client.get("/api/asistencias/").status_code, 401)

    def test_flujo_completo_grua(self):
        self.login("asegurado@demo.com")
        with self.captureOnCommitCallbacks(execute=True):
            r = self.crear_grua()
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["estado"], EstadoSolicitud.ASIGNADA)
        self.assertEqual(r.data["proveedor"]["nombre"], "Grúas El Dorado SAS")
        # El técnico más cercano a la ubicación es Carlos Pérez
        self.assertEqual(r.data["tecnico"]["nombre"], "Carlos Pérez")
        self.assertIsNotNone(r.data["eta_minutos"])
        sid = r.data["id"]

        self.assertTrue(
            Notificacion.objects.filter(usuario=self.asegurado, titulo__icontains="asignada").exists()
        )
        self.assertFalse(Tecnico.objects.get(nombre="Carlos Pérez").disponible)

        # El técnico avanza los estados
        self.login("tecnico@gruaseldorado.com")
        for estado in ["EN_CAMINO", "EN_SITIO", "FINALIZADA"]:
            with self.captureOnCommitCallbacks(execute=True):
                r = self.client.post(
                    f"/api/proveedor/asistencias/{sid}/cambiar-estado/", {"estado": estado}
                )
            self.assertEqual(r.status_code, 200, r.data)
            self.assertEqual(r.data["estado"], estado)
        self.assertTrue(Tecnico.objects.get(nombre="Carlos Pérez").disponible)

        # El asegurado consulta el seguimiento y califica
        self.login("asegurado@demo.com")
        r = self.client.get(f"/api/asistencias/{sid}/seguimiento/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(all(p["completado"] for p in r.data["pasos"] if p["estado"] != "EN_PROCESO"))
        r = self.client.post(f"/api/asistencias/{sid}/calificar/", {"calificacion": 4})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(Proveedor.objects.get(nit="900100001-1").calificacion, Decimal("4.00"))

    def test_transicion_invalida(self):
        self.login("asegurado@demo.com")
        sid = self.crear_grua().data["id"]
        self.login("tecnico@gruaseldorado.com")
        r = self.client.post(f"/api/proveedor/asistencias/{sid}/cambiar-estado/", {"estado": "FINALIZADA"})
        self.assertEqual(r.status_code, 400)

    def test_rechazo_reasigna_siguiente_proveedor(self):
        self.login("asegurado@demo.com")
        sid = self.crear_grua().data["id"]
        self.login("proveedor@gruaseldorado.com")
        r = self.client.post(f"/api/proveedor/asistencias/{sid}/rechazar/", {"motivo": "Sin grúa"})
        self.assertEqual(r.status_code, 200, r.data)
        s = SolicitudAsistencia.objects.get(pk=sid)
        self.assertEqual(s.estado, EstadoSolicitud.ASIGNADA)
        self.assertEqual(s.proveedor.nombre, "Grúas del Norte")
        # El técnico del primer proveedor quedó libre
        self.assertTrue(Tecnico.objects.get(nombre="Carlos Pérez").disponible)

    def test_sin_proveedor_por_ubicacion_lejana(self):
        self.login("asegurado@demo.com")
        r = self.client.post(
            "/api/asistencias/",
            {
                "tipo_servicio": "CARRO_TALLER",
                "descripcion": "Varado en Medellín",
                "latitud": "6.244200",
                "longitud": "-75.581200",
            },
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["estado"], EstadoSolicitud.SIN_PROVEEDOR)

    def test_no_duplicar_solicitud_activa(self):
        self.login("asegurado@demo.com")
        self.crear_grua()
        r = self.crear_grua()
        self.assertEqual(r.status_code, 400)

    def test_cancelar_libera_tecnico(self):
        self.login("asegurado@demo.com")
        sid = self.crear_grua().data["id"]
        r = self.client.post(f"/api/asistencias/{sid}/cancelar/", {"motivo": "Ya arrancó"})
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(r.data["estado"], EstadoSolicitud.CANCELADA)
        self.assertTrue(Tecnico.objects.get(nombre="Carlos Pérez").disponible)

    def test_asistencia_legal_remota(self):
        self.login("asegurado@demo.com")
        r = self.client.post(
            "/api/asistencias/",
            {"tipo_servicio": "LEGAL", "descripcion": "Necesito asesoría por comparendo", **UBICACION},
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["proveedor"]["nombre"], "Abogados Viales Asociados")

    def test_poliza_vencida(self):
        Poliza.objects.filter(numero="POL-0001").update(fecha_fin=date.today() - timedelta(days=1))
        self.login("asegurado@demo.com")
        r = self.client.post(
            "/api/asistencias/",
            {"tipo_servicio": "GRUA", "descripcion": "x", "destino_direccion": "y", "poliza": Poliza.objects.get(numero="POL-0001").pk, **UBICACION},
        )
        self.assertEqual(r.status_code, 400)

    def test_asegurado_no_ve_solicitudes_ajenas(self):
        self.login("asegurado@demo.com")
        sid = self.crear_grua().data["id"]
        otro = Usuario.objects.create_user("otro@demo.com", PASSWORD, first_name="O", last_name="T")
        self.login(otro.email)
        self.assertEqual(self.client.get(f"/api/asistencias/{sid}/").status_code, 404)

    def test_tipos_servicio_publico(self):
        r = self.client.get("/api/tipos-servicio/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(any(t["codigo"] == "GRUA" for t in r.data))
        self.assertTrue(TipoServicio.objects.exists())
