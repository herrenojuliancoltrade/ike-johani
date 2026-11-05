# Backend – Plataforma de Asistencias (Django REST Framework)

Backend para que los asegurados soliciten asistencias (grúa, carro taller, legal, etc.),
el sistema busque y asigne automáticamente el proveedor más adecuado y el asegurado
haga seguimiento del servicio. Toda la lógica está en Python (sin Power Automate ni flujos externos).

## Arrancar

```powershell
cd backend
.\env\Scripts\activate
pip install -r requirements.txt     # (ya instalado)
python manage.py migrate
python manage.py cargar_datos_demo  # datos de prueba
python manage.py runserver
```

- API: http://127.0.0.1:8000/api/
- Admin: http://127.0.0.1:8000/admin/  (admin@ike.com / Demo12345*)
- Tests: `python manage.py test apps`

## Base de datos

Por defecto SQLite. Para PostgreSQL, en `.env`:

```
DB_ENGINE=postgresql
DB_NAME=ike_asistencias
DB_USER=postgres
DB_PASSWORD=tu_clave
DB_HOST=localhost
DB_PORT=5432
```

y luego `python manage.py migrate`. El driver (`psycopg`) ya está instalado.

## Estructura

```
config/                 settings, urls
apps/usuarios/          Usuario (login por email, roles), registro, JWT
apps/polizas/           Pólizas y servicios cubiertos
apps/proveedores/       Tipos de servicio, proveedores, técnicos
apps/asistencias/       Solicitudes, historial, notificaciones
  services/asignacion.py   motor de búsqueda y asignación de proveedores
  services/estados.py      máquina de estados + historial
  services/geo.py          distancia (Haversine) y tiempo estimado de llegada
  services/notificaciones.py
  management/commands/     cargar_datos_demo, reintentar_asignaciones
```

## Roles

| Rol | Qué hace |
|---|---|
| ASEGURADO | Se registra con su póliza, pide asistencias, hace seguimiento, cancela, califica |
| PROVEEDOR | Usuario de la empresa proveedora o técnico: ve sus servicios, cambia estados, rechaza, actualiza GPS |
| OPERADOR / ADMIN | Gestiona pólizas, proveedores, técnicos, usuarios; reasigna servicios |

## Endpoints principales

Autenticación (JWT, header `Authorization: Bearer <access>`):

| Método | URL | Descripción |
|---|---|---|
| POST | `/api/auth/registro/` | Registro de asegurado (`email, password, first_name, last_name, tipo_documento, documento, telefono, numero_poliza`) |
| POST | `/api/auth/login/` | `{email, password}` → `{access, refresh, usuario}` |
| POST | `/api/auth/refresh/` | `{refresh}` → nuevo access |
| POST | `/api/auth/logout/` | `{refresh}` → invalida token |
| GET/PATCH | `/api/auth/me/` | Perfil |
| POST | `/api/auth/cambiar-password/` | |

Asegurado:

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/tipos-servicio/` | Catálogo (público) |
| GET | `/api/polizas/` | Mis pólizas |
| POST | `/api/polizas/vincular/` | Vincular otra póliza |
| POST | `/api/asistencias/` | Solicitar asistencia (asigna proveedor automáticamente) |
| GET | `/api/asistencias/` / `activas/` / `{id}/` | Mis solicitudes |
| GET | `/api/asistencias/{id}/seguimiento/` | Estado, proveedor, técnico, ETA, pasos e historial (para polling) |
| POST | `/api/asistencias/{id}/cancelar/` | `{motivo}` |
| POST | `/api/asistencias/{id}/calificar/` | `{calificacion: 1-5, comentario}` |
| POST | `/api/asistencias/{id}/reintentar/` | Reintentar si quedó sin proveedor |
| GET | `/api/notificaciones/` , `no-leidas/` | Notificaciones |
| POST | `/api/notificaciones/{id}/marcar-leida/` , `marcar-todas-leidas/` | |

Ejemplo de solicitud:

```json
POST /api/asistencias/
{
  "tipo_servicio": "GRUA",
  "descripcion": "El carro no enciende después de un choque",
  "latitud": 4.66, "longitud": -74.11,
  "direccion": "Av. Calle 26 # 70-10",
  "destino_direccion": "Taller Calle 13"
}
```

`poliza` (id) o `numero_poliza` es opcional si el asegurado tiene una sola póliza vigente.
Códigos de servicio: `GRUA, CARRO_TALLER, LEGAL, CERRAJERIA, PASO_CORRIENTE, CAMBIO_LLANTA, COMBUSTIBLE, OTRA`.

Proveedor / técnico:

| Método | URL | Descripción |
|---|---|---|
| GET | `/api/proveedor/asistencias/` | Servicios asignados a mi empresa (o a mí si soy técnico) |
| POST | `/api/proveedor/asistencias/{id}/cambiar-estado/` | `{estado: EN_CAMINO / EN_SITIO / EN_PROCESO / FINALIZADA, comentario}` |
| POST | `/api/proveedor/asistencias/{id}/rechazar/` | `{motivo}` → se reasigna automáticamente al siguiente |
| POST | `/api/proveedor/asistencias/{id}/asignar-tecnico/` | `{tecnico}` |
| POST | `/api/tecnicos/{id}/ubicacion/` | `{latitud, longitud}` → recalcula ETA |

Aseguradora (operador/admin): CRUD en `/api/polizas/`, `/api/proveedores/`, `/api/tecnicos/`,
`/api/usuarios/`, `/api/tipos-servicio/`; además `GET /api/asistencias/{id}/candidatos/` (ranking)
y `POST /api/asistencias/{id}/reasignar/`.

## Cómo se asigna el proveedor

1. Proveedores activos y disponibles que prestan ese tipo de servicio.
2. Se descartan los que están fuera de su radio de cobertura (excepto servicios remotos como legal)
   o sin capacidad (todos sus técnicos ocupados).
3. Por cada proveedor se toma el técnico disponible más cercano (por su GPS o la base del proveedor).
4. Puntaje = `distancia·PESO_DISTANCIA + servicios_activos·PESO_CARGA + (5 − calificación)·PESO_CALIFICACION`
   (configurable en `.env`). Gana el menor.
5. La reserva del técnico es atómica, para que no quede en dos servicios al tiempo.
6. ETA = alistamiento + distancia × 1.3 / velocidad del proveedor.
7. Si nadie puede atender → `SIN_PROVEEDOR`; `python manage.py reintentar_asignaciones --loop 60`
   vuelve a intentar periódicamente.

Estados: `PENDIENTE → ASIGNADA → EN_CAMINO → EN_SITIO → (EN_PROCESO) → FINALIZADA`,
además de `SIN_PROVEEDOR` y `CANCELADA`.
