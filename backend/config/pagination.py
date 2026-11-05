from django.conf import settings
from rest_framework.pagination import PageNumberPagination


class Paginacion(PageNumberPagination):
    """Paginación por defecto; el cliente puede pedir ?page_size= hasta 100."""

    page_size = settings.REST_FRAMEWORK.get("PAGE_SIZE", 20)
    page_size_query_param = "page_size"
    max_page_size = 100
