#!/bin/sh
# Tareas previas al arranque del servidor. Variables (todas opcionales):
#   RUN_MIGRATIONS=True            aplica migraciones (por defecto True)
#   LOAD_DEMO_DATA=True            carga datos demo (idempotente, por defecto False)
#   DJANGO_SUPERUSER_EMAIL / DJANGO_SUPERUSER_PASSWORD /
#   DJANGO_SUPERUSER_FIRST_NAME / DJANGO_SUPERUSER_LAST_NAME
#                                  crea el superusuario si aún no existe
set -e

if [ "${RUN_MIGRATIONS:-True}" = "True" ]; then
  echo "==> Aplicando migraciones"
  python manage.py migrate --noinput
fi

if [ "${LOAD_DEMO_DATA:-False}" = "True" ]; then
  echo "==> Cargando datos demo"
  python manage.py cargar_datos_demo
fi

if [ -n "${DJANGO_SUPERUSER_EMAIL:-}" ] && [ -n "${DJANGO_SUPERUSER_PASSWORD:-}" ]; then
  echo "==> Verificando superusuario ${DJANGO_SUPERUSER_EMAIL}"
  export DJANGO_SUPERUSER_FIRST_NAME="${DJANGO_SUPERUSER_FIRST_NAME:-Admin}"
  export DJANGO_SUPERUSER_LAST_NAME="${DJANGO_SUPERUSER_LAST_NAME:-IKE}"
  if python manage.py shell -c "import os, sys; from django.contrib.auth import get_user_model; sys.exit(0 if get_user_model().objects.filter(email__iexact=os.environ['DJANGO_SUPERUSER_EMAIL']).exists() else 1)"; then
    echo "    ya existe, se omite"
  else
    python manage.py createsuperuser --noinput
  fi
fi

exec "$@"
