"""Utilidades geográficas sin dependencias externas."""

import math
from datetime import timedelta

from django.conf import settings
from django.utils import timezone

RADIO_TIERRA_KM = 6371.0088


def distancia_km(lat1, lon1, lat2, lon2):
    """Distancia en línea recta (fórmula de Haversine) entre dos coordenadas."""
    lat1, lon1, lat2, lon2 = map(lambda v: math.radians(float(v)), (lat1, lon1, lat2, lon2))
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    return 2 * RADIO_TIERRA_KM * math.asin(math.sqrt(a))


# Las vías no son líneas rectas: factor de corrección promedio para ciudad.
FACTOR_RUTA = 1.3


def estimar_minutos(distancia, velocidad_kmh=None, incluir_alistamiento=True):
    conf = settings.ASIGNACION
    velocidad = float(velocidad_kmh or conf["VELOCIDAD_DEFECTO_KMH"]) or 1
    minutos = (float(distancia) * FACTOR_RUTA / velocidad) * 60
    if incluir_alistamiento:
        minutos += conf["MINUTOS_ALISTAMIENTO"]
    return max(1, math.ceil(minutos))


def hora_llegada(minutos):
    return timezone.now() + timedelta(minutes=minutos)
