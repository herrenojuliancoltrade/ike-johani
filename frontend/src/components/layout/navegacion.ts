import {
  BellIcon,
  BuildingIcon,
  ClipboardListIcon,
  HomeIcon,
  PlusIcon,
  ShieldCheckIcon,
  type LucideIcon,
} from "lucide-react"

import type { Rol } from "@/lib/types"

export interface NavItem {
  to: string
  label: string
  /** Etiqueta corta para la barra inferior del celular */
  corto?: string
  icon: LucideIcon
  /** Botón destacado (acción principal) */
  destacado?: boolean
  /** Muestra el contador de notificaciones sin leer */
  contador?: boolean
}

const GESTION: NavItem[] = [
  { to: "/gestion", label: "Solicitudes", icon: ClipboardListIcon },
  { to: "/gestion/proveedores", label: "Proveedores", icon: BuildingIcon },
  { to: "/gestion/polizas", label: "Pólizas", icon: ShieldCheckIcon },
  { to: "/notificaciones", label: "Notificaciones", corto: "Alertas", icon: BellIcon, contador: true },
]

export const NAV: Record<Rol, NavItem[]> = {
  ASEGURADO: [
    { to: "/asistencias", label: "Mis asistencias", corto: "Inicio", icon: HomeIcon },
    { to: "/asistencias/nueva", label: "Solicitar asistencia", corto: "Solicitar", icon: PlusIcon, destacado: true },
    { to: "/polizas", label: "Mis pólizas", corto: "Pólizas", icon: ShieldCheckIcon },
    { to: "/notificaciones", label: "Notificaciones", corto: "Alertas", icon: BellIcon, contador: true },
  ],
  PROVEEDOR: [
    { to: "/proveedor", label: "Servicios asignados", corto: "Servicios", icon: ClipboardListIcon },
    { to: "/notificaciones", label: "Notificaciones", corto: "Alertas", icon: BellIcon, contador: true },
  ],
  OPERADOR: GESTION,
  ADMIN: GESTION,
}

/** El item activo es el de ruta más larga que coincide con la URL actual. */
export function itemActivo(items: NavItem[], pathname: string) {
  return items
    .filter((i) => pathname === i.to || pathname.startsWith(`${i.to}/`))
    .sort((a, b) => b.to.length - a.to.length)[0]?.to
}
