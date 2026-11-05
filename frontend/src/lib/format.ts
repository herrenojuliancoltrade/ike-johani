import {
  BatteryChargingIcon,
  CarIcon,
  CircleDotIcon,
  FuelIcon,
  KeyRoundIcon,
  LifeBuoyIcon,
  ScaleIcon,
  TruckIcon,
  WrenchIcon,
  type LucideIcon,
} from "lucide-react"

import type { CodigoServicio, Estado, Rol } from "@/lib/types"

export const ICONOS_SERVICIO: Record<CodigoServicio, LucideIcon> = {
  GRUA: TruckIcon,
  CARRO_TALLER: WrenchIcon,
  LEGAL: ScaleIcon,
  CERRAJERIA: KeyRoundIcon,
  PASO_CORRIENTE: BatteryChargingIcon,
  CAMBIO_LLANTA: CircleDotIcon,
  COMBUSTIBLE: FuelIcon,
  OTRA: LifeBuoyIcon,
}

export function iconoServicio(codigo: string): LucideIcon {
  return ICONOS_SERVICIO[codigo as CodigoServicio] ?? CarIcon
}

export const ESTADOS: Record<Estado, string> = {
  PENDIENTE: "Pendiente",
  SIN_PROVEEDOR: "Sin proveedor",
  ASIGNADA: "Asignada",
  EN_CAMINO: "En camino",
  EN_SITIO: "En el sitio",
  EN_PROCESO: "En proceso",
  FINALIZADA: "Finalizada",
  CANCELADA: "Cancelada",
}

type BadgeVariant = "default" | "secondary" | "destructive" | "outline"

export const VARIANTE_ESTADO: Record<Estado, BadgeVariant> = {
  PENDIENTE: "secondary",
  SIN_PROVEEDOR: "destructive",
  ASIGNADA: "default",
  EN_CAMINO: "default",
  EN_SITIO: "default",
  EN_PROCESO: "default",
  FINALIZADA: "outline",
  CANCELADA: "secondary",
}

export const ESTADOS_ACTIVOS: Estado[] = [
  "PENDIENTE",
  "SIN_PROVEEDOR",
  "ASIGNADA",
  "EN_CAMINO",
  "EN_SITIO",
  "EN_PROCESO",
]

export const ESTADOS_CANCELABLES: Estado[] = [
  "PENDIENTE",
  "SIN_PROVEEDOR",
  "ASIGNADA",
  "EN_CAMINO",
]

export const ROLES: Record<Rol, string> = {
  ASEGURADO: "Asegurado",
  PROVEEDOR: "Proveedor",
  OPERADOR: "Operador",
  ADMIN: "Administrador",
}

const fechaHora = new Intl.DateTimeFormat("es-CO", {
  dateStyle: "medium",
  timeStyle: "short",
})
const soloHora = new Intl.DateTimeFormat("es-CO", { timeStyle: "short" })
const soloFecha = new Intl.DateTimeFormat("es-CO", { dateStyle: "medium" })

export function formatFechaHora(iso: string | null | undefined) {
  return iso ? fechaHora.format(new Date(iso)) : "—"
}

export function formatHora(iso: string | null | undefined) {
  return iso ? soloHora.format(new Date(iso)) : "—"
}

export function formatFecha(iso: string | null | undefined) {
  // Las fechas "YYYY-MM-DD" se interpretan en hora local
  if (!iso) return "—"
  const fecha = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso)
  return soloFecha.format(fecha)
}

export function tiempoRelativo(iso: string) {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return "hace un momento"
  if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`
  if (diff < 86400) return `hace ${Math.floor(diff / 3600)} h`
  return formatFecha(iso)
}

export function iniciales(nombre: string) {
  return nombre
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

export function urlMapa(lat: string | number, lon: string | number) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
}
