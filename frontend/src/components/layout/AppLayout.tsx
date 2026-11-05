import { Link, Outlet, useLocation } from "react-router"
import {
  BuildingIcon,
  ClipboardListIcon,
  FileTextIcon,
  LayoutListIcon,
  LifeBuoyIcon,
  PlusIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { MenuNotificaciones } from "@/components/layout/MenuNotificaciones"
import { MenuUsuario } from "@/components/layout/MenuUsuario"
import { Button } from "@/components/ui/button"
import type { Rol } from "@/lib/types"

interface NavItem {
  to: string
  label: string
  icon: LucideIcon
}

const NAV: Record<Rol, NavItem[]> = {
  ASEGURADO: [
    { to: "/asistencias", label: "Mis asistencias", icon: LayoutListIcon },
    { to: "/asistencias/nueva", label: "Solicitar", icon: PlusIcon },
    { to: "/polizas", label: "Mis pólizas", icon: FileTextIcon },
  ],
  PROVEEDOR: [{ to: "/proveedor", label: "Servicios asignados", icon: ClipboardListIcon }],
  OPERADOR: [
    { to: "/gestion", label: "Solicitudes", icon: ClipboardListIcon },
    { to: "/gestion/proveedores", label: "Proveedores", icon: BuildingIcon },
    { to: "/gestion/polizas", label: "Pólizas", icon: ShieldCheckIcon },
  ],
  ADMIN: [
    { to: "/gestion", label: "Solicitudes", icon: ClipboardListIcon },
    { to: "/gestion/proveedores", label: "Proveedores", icon: BuildingIcon },
    { to: "/gestion/polizas", label: "Pólizas", icon: ShieldCheckIcon },
  ],
}

export function AppLayout() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const items = usuario ? NAV[usuario.rol] : []

  // El item activo es el de ruta más larga que coincide con la URL actual.
  const activo = items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to

  return (
    <div className="flex min-h-svh flex-col">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-4 px-4">
          <Link to="/" className="flex shrink-0 items-center gap-2 font-semibold">
            <LifeBuoyIcon />
            <span className="hidden sm:inline">IKE Asistencias</span>
          </Link>
          <nav className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {items.map((item) => (
              <Button
                key={item.to}
                variant={activo === item.to ? "secondary" : "ghost"}
                size="sm"
                render={<Link to={item.to} />}
                nativeButton={false}
              >
                <item.icon data-icon="inline-start" />
                <span className="hidden md:inline">{item.label}</span>
              </Button>
            ))}
          </nav>
          <div className="flex items-center gap-1">
            <MenuNotificaciones />
            <MenuUsuario />
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6">
        <Outlet />
      </main>
    </div>
  )
}
