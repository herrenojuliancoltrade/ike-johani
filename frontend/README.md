# Frontend – IKE Asistencias (React + TypeScript + shadcn/ui)

## Arrancar

```powershell
# 1. Backend (otra terminal)
cd ..\backend
.\env\Scripts\activate
python manage.py runserver

# 2. Frontend
cd ..\frontend
npm install      # solo la primera vez
npm run dev      # http://localhost:5173
```

## Conexión con el backend

En `.env`:

```
VITE_API_URL=http://127.0.0.1:8000/api   # URL de la API de Django
VITE_POLLING_MS=10000                    # cada cuánto se refresca el seguimiento
```

Si cambias el puerto o dominio del front, agrégalo a `CORS_ALLOWED_ORIGINS` en `backend/.env`.

## Stack

- Vite + React 19 + TypeScript
- shadcn/ui (Base UI, Tailwind v4, lucide-react)
- React Router, TanStack Query (cache + polling), sonner (toasts)

## Estructura

```
src/lib/api.ts            cliente HTTP: JWT, refresh automático, errores de DRF
src/lib/types.ts          tipos de la API
src/lib/format.ts         estados, iconos, fechas
src/auth/                 AuthProvider, useAuth, guardas de rutas por rol
src/components/layout/    header, menú de usuario, notificaciones
src/pages/auth/           login, registro
src/pages/asegurado/      mis asistencias, solicitar, seguimiento, mis pólizas
src/pages/proveedor/      servicios asignados, cambio de estado, compartir GPS
src/pages/gestion/        solicitudes (candidatos/reasignar), proveedores, pólizas
```

## Usuarios demo (`python manage.py cargar_datos_demo`)

Clave: `Demo12345*`

| Rol | Email |
|---|---|
| Asegurado | asegurado@demo.com |
| Proveedor | proveedor@gruaseldorado.com |
| Técnico | tecnico@gruaseldorado.com |
| Operador | operador@ike.com |
| Admin | admin@ike.com |
