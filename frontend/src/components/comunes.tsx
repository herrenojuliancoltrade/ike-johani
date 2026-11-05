import { createElement, type ReactNode } from "react"
import type { LucideProps } from "lucide-react"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { ApiError } from "@/lib/api"
import { ESTADOS, iconoServicio, VARIANTE_ESTADO } from "@/lib/format"
import type { Estado } from "@/lib/types"

export function EstadoBadge({ estado }: { estado: Estado }) {
  return <Badge variant={VARIANTE_ESTADO[estado]}>{ESTADOS[estado]}</Badge>
}

export function Encabezado({
  titulo,
  descripcion,
  acciones,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

export function mensajeError(error: unknown) {
  if (error instanceof ApiError) return error.message
  if (error instanceof Error) return error.message
  return "Ocurrió un error inesperado."
}

export function ErrorAlert({ error, titulo = "No se pudo completar la acción" }: { error: unknown; titulo?: string }) {
  if (!error) return null
  return (
    <Alert variant="destructive">
      <CircleAlertIcon />
      <AlertTitle>{titulo}</AlertTitle>
      <AlertDescription>{mensajeError(error)}</AlertDescription>
    </Alert>
  )
}

/** Devuelve el error de un campo específico si la API lo reportó. */
export function errorCampo(error: unknown, campo: string) {
  return error instanceof ApiError ? error.fieldErrors[campo] : undefined
}

/** Icono del tipo de servicio (grúa, taller, legal...). */
export function ServicioIcono({ codigo, ...props }: { codigo: string } & LucideProps) {
  return createElement(iconoServicio(codigo), props)
}
