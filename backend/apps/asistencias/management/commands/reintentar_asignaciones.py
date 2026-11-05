"""
Reintenta asignar proveedor a las solicitudes que quedaron SIN_PROVEEDOR.

Uso:
    python manage.py reintentar_asignaciones            # una sola pasada
    python manage.py reintentar_asignaciones --loop 60  # cada 60 segundos

Se puede programar con el Programador de tareas de Windows / cron, o dejarlo
corriendo con --loop. Es lógica 100% Python.
"""

import time

from django.core.management.base import BaseCommand

from apps.asistencias.models import EstadoSolicitud, SolicitudAsistencia
from apps.asistencias.services.asignacion import asignar_proveedor


class Command(BaseCommand):
    help = "Reintenta asignar proveedor a solicitudes sin proveedor."

    def add_arguments(self, parser):
        parser.add_argument("--loop", type=int, default=0, help="Segundos entre pasadas (0 = una vez)")

    def pasada(self):
        pendientes = list(
            SolicitudAsistencia.objects.filter(
                estado__in=[EstadoSolicitud.SIN_PROVEEDOR, EstadoSolicitud.PENDIENTE]
            ).order_by("creado")
        )
        asignadas = 0
        for solicitud in pendientes:
            resultado = asignar_proveedor(solicitud)
            if resultado.estado == EstadoSolicitud.ASIGNADA:
                asignadas += 1
                self.stdout.write(f"  #{solicitud.pk} asignada a {resultado.proveedor}")
        self.stdout.write(self.style.SUCCESS(f"Revisadas {len(pendientes)}, asignadas {asignadas}"))

    def handle(self, *args, **opts):
        if not opts["loop"]:
            return self.pasada()
        self.stdout.write(f"Reintentando cada {opts['loop']}s (Ctrl+C para salir)")
        while True:
            self.pasada()
            time.sleep(opts["loop"])
