import { createElement, type ReactNode } from "react"
import type { LucideIcon, LucideProps } from "lucide-react"
import { CircleAlertIcon } from "lucide-react"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ApiError } from "@/lib/api"
import { ESTADOS, iconoServicio, tonoServicio, VARIANTE_ESTADO } from "@/lib/format"
import type { Estado } from "@/lib/types"
import { cn } from "@/lib/utils"

const ESTADOS_EN_VIVO: Estado[] = ["ASIGNADA", "EN_CAMINO", "EN_SITIO", "EN_PROCESO"]

export function EstadoBadge({ estado, className }: { estado: Estado; className?: string }) {
  const enVivo = ESTADOS_EN_VIVO.includes(estado)
  return (
    <Badge variant={VARIANTE_ESTADO[estado]} className={className}>
      <span className="relative flex size-1.5">
        {enVivo && (
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-current opacity-60" />
        )}
        <span className="relative inline-flex size-1.5 rounded-full bg-current" />
      </span>
      {ESTADOS[estado]}
    </Badge>
  )
}

export function Encabezado({
  titulo,
  descripcion,
  acciones,
  antetitulo,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  /** Texto pequeño sobre el título (sección, saludo...). */
  antetitulo?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1.5">
        {antetitulo && (
          <span className="text-xs font-semibold tracking-wider text-primary uppercase">
            {antetitulo}
          </span>
        )}
        <h1 className="text-2xl font-semibold md:text-3xl">{titulo}</h1>
        {descripcion && <p className="text-sm text-muted-foreground md:text-base">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap items-center gap-2">{acciones}</div>}
    </div>
  )
}

/** Título de sección dentro de una página. */
export function Seccion({
  titulo,
  descripcion,
  acciones,
  children,
  className,
}: {
  titulo: ReactNode
  descripcion?: ReactNode
  acciones?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-lg font-semibold">{titulo}</h2>
          {descripcion && <p className="text-sm text-muted-foreground">{descripcion}</p>}
        </div>
        {acciones}
      </div>
      {children}
    </section>
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

const TAMANOS_TILE = {
  sm: "size-8 rounded-lg [&_svg]:size-4",
  md: "size-10 rounded-xl [&_svg]:size-5",
  lg: "size-14 rounded-2xl [&_svg]:size-7",
}

/** Icono del servicio dentro de un recuadro con el color propio de cada servicio. */
export function ServicioTile({
  codigo,
  size = "md",
  className,
}: {
  codigo: string
  size?: keyof typeof TAMANOS_TILE
  className?: string
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        TAMANOS_TILE[size],
        tonoServicio(codigo),
        className
      )}
    >
      <ServicioIcono codigo={codigo} />
    </span>
  )
}

const TONOS_STAT = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground dark:text-warning",
  destructive: "bg-destructive/10 text-destructive",
  info: "bg-info/12 text-info",
}

/** Tarjeta de métrica (KPI) con icono de color. */
export function StatCard({
  titulo,
  valor,
  descripcion,
  icono: Icono,
  tono = "primary",
}: {
  titulo: string
  valor: ReactNode
  descripcion?: string
  icono: LucideIcon
  tono?: keyof typeof TONOS_STAT
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardDescription>{titulo}</CardDescription>
        <CardTitle>
          <span className="text-3xl font-semibold tabular-nums">{valor}</span>
        </CardTitle>
        {descripcion && <CardDescription className="text-xs">{descripcion}</CardDescription>}
        <CardAction>
          <span className={cn("flex size-10 items-center justify-center rounded-xl", TONOS_STAT[tono])}>
            <Icono className="size-5" />
          </span>
        </CardAction>
      </CardHeader>
    </Card>
  )
}

/** Número de paso (1, 2, 3...) para formularios por etapas. */
export function NumeroPaso({ n }: { n: number }) {
  return (
    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
      {n}
    </span>
  )
}
