"""
Health check para Render (healthCheckPath: /api/health/).

Es un middleware y va de primero en MIDDLEWARE para responder antes de la
validación de ALLOWED_HOSTS y de la redirección a HTTPS: el chequeo interno de
Render llega por HTTP y no siempre con el dominio público como Host.
"""

from django.db import connection
from django.http import JsonResponse

HEALTH_PATH = "/api/health/"


class HealthCheckMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path != HEALTH_PATH:
            return self.get_response(request)
        try:
            connection.ensure_connection()
        except Exception:  # noqa: BLE001 - cualquier fallo de BD = servicio no sano
            return JsonResponse({"status": "error", "database": "unavailable"}, status=503)
        return JsonResponse({"status": "ok"})
