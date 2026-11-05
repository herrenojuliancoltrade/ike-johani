import { useState } from "react"
import { Link, useParams } from "react-router"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeftIcon,
  BuildingIcon,
  CarIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  PhoneIcon,
  RefreshCwIcon,
  SearchXIcon,
  StarIcon,
  UserIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, EstadoBadge, mensajeError, ServicioTile } from "@/components/comunes"
import { Alert, AlertAction, AlertDescription, AlertTitle } from "@/components/ui/alert"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field"
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { api, POLLING_MS } from "@/lib/api"
import {
  ESTADOS_CANCELABLES,
  formatFechaHora,
  formatHora,
  urlMapa,
} from "@/lib/format"
import type { Seguimiento, Solicitud } from "@/lib/types"
import { cn } from "@/lib/utils"

const FINALES = ["FINALIZADA", "CANCELADA"]

export function DetalleAsistenciaPage() {
  const { id } = useParams()
  const queryClient = useQueryClient()

  const detalle = useQuery({
    queryKey: ["asistencias", id],
    queryFn: () => api<Solicitud>(`/asistencias/${id}/`),
  })

  const seguimiento = useQuery({
    queryKey: ["asistencias", id, "seguimiento"],
    queryFn: () => api<Seguimiento>(`/asistencias/${id}/seguimiento/`),
    refetchInterval: (q) => (q.state.data && FINALES.includes(q.state.data.estado) ? false : POLLING_MS),
  })

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["asistencias"] })

  const reintentar = useMutation({
    mutationFn: () => api<Solicitud>(`/asistencias/${id}/reintentar/`, { method: "POST" }),
    onSuccess: (s) => {
      refrescar()
      if (s.estado === "ASIGNADA") toast.success("¡Encontramos un proveedor!")
      else toast.info("Aún no hay proveedores disponibles. Seguimos buscando.")
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (detalle.isPending || seguimiento.isPending) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }
  if (detalle.error || seguimiento.error) {
    return <ErrorAlert error={detalle.error ?? seguimiento.error} titulo="No se pudo cargar la asistencia" />
  }

  const s = detalle.data
  const seg = seguimiento.data
  const pasos = seg.pasos
  const completados = pasos.filter((p) => p.completado).length
  const progreso = seg.estado === "FINALIZADA" ? 100 : Math.round(((completados - 1) / (pasos.length - 1)) * 100)
  const enRuta = ["ASIGNADA", "EN_CAMINO"].includes(seg.estado)

  return (
    <>
      <Encabezado
        antetitulo={`Solicitud #${s.id}`}
        titulo={
          <span className="flex flex-wrap items-center gap-3">
            <ServicioTile codigo={s.tipo_servicio} size="lg" />
            <span className="flex flex-col gap-1.5">
              {s.tipo_servicio_nombre}
              <EstadoBadge estado={seg.estado} className="w-fit" />
            </span>
          </span>
        }
        descripcion={`${formatFechaHora(s.creado)} · Póliza ${s.poliza_numero}`}
        acciones={
          <>
            <Button variant="ghost" render={<Link to="/asistencias" />} nativeButton={false}>
              <ArrowLeftIcon data-icon="inline-start" />
              Volver
            </Button>
            {ESTADOS_CANCELABLES.includes(seg.estado) && <CancelarDialog id={s.id} onDone={refrescar} />}
          </>
        }
      />

      {seg.estado === "SIN_PROVEEDOR" && (
        <Alert variant="destructive">
          <SearchXIcon />
          <AlertTitle>Estamos buscando un proveedor</AlertTitle>
          <AlertDescription>
            En este momento no hay proveedores disponibles cerca. Seguiremos intentando automáticamente.
          </AlertDescription>
          <AlertAction>
            <Button size="sm" variant="outline" onClick={() => reintentar.mutate()} disabled={reintentar.isPending}>
              {reintentar.isPending ? <Spinner data-icon="inline-start" /> : <RefreshCwIcon data-icon="inline-start" />}
              Reintentar
            </Button>
          </AlertAction>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-6">
          {seg.proveedor && seg.estado !== "CANCELADA" && (
            <Card>
              <CardHeader>
                <CardTitle>Tu proveedor asignado</CardTitle>
                <CardDescription>
                  {enRuta
                    ? "Se actualiza automáticamente mientras el técnico se acerca."
                    : "Datos del proveedor que atiende tu servicio."}
                </CardDescription>
                {enRuta && seg.eta_minutos !== null && (
                  <CardAction className="flex flex-col items-end rounded-2xl bg-primary/10 px-4 py-2 text-primary">
                    <span className="text-4xl leading-none font-semibold tabular-nums">
                      {seg.eta_minutos}
                      <span className="text-lg font-medium"> min</span>
                    </span>
                    <span className="text-xs">llega aprox. {formatHora(seg.hora_estimada_llegada)}</span>
                  </CardAction>
                )}
              </CardHeader>
              <CardContent>
                <ItemGroup>
                  <Item variant="muted">
                    <ItemMedia variant="icon">
                      <BuildingIcon />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle>{seg.proveedor.nombre}</ItemTitle>
                      <ItemDescription>
                        Calificación {Number(seg.proveedor.calificacion).toFixed(1)} / 5
                      </ItemDescription>
                    </ItemContent>
                  </Item>
                  {seg.tecnico && (
                    <Item variant="muted">
                      <ItemMedia variant="icon">
                        <UserIcon />
                      </ItemMedia>
                      <ItemContent>
                        <ItemTitle>{seg.tecnico.nombre}</ItemTitle>
                        <ItemDescription>
                          {seg.tecnico.placa_vehiculo ? `Vehículo ${seg.tecnico.placa_vehiculo}` : "Técnico asignado"}
                          {seg.distancia_km ? ` · a ${Number(seg.distancia_km).toFixed(1)} km` : ""}
                        </ItemDescription>
                      </ItemContent>
                    </Item>
                  )}
                </ItemGroup>
              </CardContent>
              <CardFooter className="flex flex-wrap gap-2">
                <Button
                  render={<a href={`tel:${seg.tecnico?.telefono ?? seg.proveedor.telefono}`} />}
                  nativeButton={false}
                >
                  <PhoneIcon data-icon="inline-start" />
                  Llamar {seg.tecnico?.telefono ?? seg.proveedor.telefono}
                </Button>
                {seg.tecnico?.latitud && seg.tecnico.longitud && enRuta && (
                  <Button
                    variant="outline"
                    render={<a href={urlMapa(seg.tecnico.latitud, seg.tecnico.longitud)} target="_blank" rel="noreferrer" />}
                    nativeButton={false}
                  >
                    <MapPinIcon data-icon="inline-start" />
                    Ver técnico en el mapa
                  </Button>
                )}
              </CardFooter>
            </Card>
          )}

          {s.estado === "FINALIZADA" && <CalificarCard solicitud={s} onDone={refrescar} />}

          <Card>
            <CardHeader>
              <CardTitle>Detalle de la solicitud</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4 text-sm">
              <p className="whitespace-pre-line">{s.descripcion}</p>
              <Separator />
              <dl className="grid gap-3 sm:grid-cols-2">
                <Dato icono={MapPinIcon} titulo="Ubicación">
                  {s.direccion || "Ubicación GPS"}
                  {s.referencia ? ` · ${s.referencia}` : ""}{" "}
                  <a className="underline underline-offset-4" href={urlMapa(s.latitud, s.longitud)} target="_blank" rel="noreferrer">
                    (mapa)
                  </a>
                </Dato>
                {s.destino_direccion && (
                  <Dato icono={CarIcon} titulo="Destino del vehículo">
                    {s.destino_direccion}
                  </Dato>
                )}
                <Dato icono={PhoneIcon} titulo="Teléfono de contacto">
                  {s.telefono_contacto}
                </Dato>
                {s.motivo_cancelacion && (
                  <Dato icono={XIcon} titulo="Motivo de cancelación">
                    {s.motivo_cancelacion}
                  </Dato>
                )}
                {s.observaciones_cierre && (
                  <Dato icono={CheckIcon} titulo="Observaciones del cierre">
                    {s.observaciones_cierre}
                  </Dato>
                )}
              </dl>
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit lg:sticky lg:top-20">
          <CardHeader>
            <CardTitle>Seguimiento</CardTitle>
            <CardDescription className="flex items-center gap-1">
              <ClockIcon className="size-3.5" />
              Actualizado {formatHora(seg.actualizado)}
              {seguimiento.isFetching && <Spinner className="size-3.5" />}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {seg.estado !== "CANCELADA" && <Progress value={Math.max(progreso, 0)} />}
            <ol className="flex flex-col">
              {pasos.map((p, i) => (
                <li key={p.estado} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < pasos.length - 1 && (
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-8 bottom-1 left-3.5 w-0.5 -translate-x-1/2 rounded-full",
                        pasos[i + 1]?.completado ? "bg-primary" : "bg-border"
                      )}
                    />
                  )}
                  <span
                    className={cn(
                      "relative flex size-7 shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold",
                      p.completado
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground",
                      p.actual && "ring-4 ring-primary/20"
                    )}
                  >
                    {p.completado ? <CheckIcon className="size-3.5" /> : i + 1}
                  </span>
                  <span className="flex flex-col pt-1 text-sm">
                    <span className={cn(p.actual && "font-semibold", !p.completado && "text-muted-foreground")}>
                      {p.nombre}
                    </span>
                    {p.actual && <span className="text-xs text-primary">Estado actual</span>}
                  </span>
                </li>
              ))}
            </ol>
            <Separator />
            <div className="flex flex-col gap-3">
              <span className="text-sm font-medium">Historial</span>
              <ol className="ml-1.5 flex flex-col gap-4 border-l pl-5">
                {[...seg.historial].reverse().map((h, i) => (
                  <li key={i} className="relative flex flex-col gap-0.5 text-sm">
                    <span
                      aria-hidden
                      className={cn(
                        "absolute top-1.5 -left-[27px] size-2.5 rounded-full ring-4 ring-card",
                        i === 0 ? "bg-primary" : "bg-muted-foreground/40"
                      )}
                    />
                    <span className="font-medium">{h.estado_nuevo_display}</span>
                    {h.comentario && <span className="text-muted-foreground">{h.comentario}</span>}
                    <span className="text-xs text-muted-foreground">{formatFechaHora(h.fecha)}</span>
                  </li>
                ))}
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  )
}

function Dato({
  icono: Icono,
  titulo,
  children,
}: {
  icono: React.ComponentType
  titulo: string
  children: React.ReactNode
}) {
  return (
    <div className="flex gap-2">
      <span className="mt-0.5 text-muted-foreground">
        <Icono />
      </span>
      <div className="flex flex-col gap-0.5">
        <dt className="text-muted-foreground">{titulo}</dt>
        <dd>{children}</dd>
      </div>
    </div>
  )
}

function CancelarDialog({ id, onDone }: { id: number; onDone: () => void }) {
  const [motivo, setMotivo] = useState("")
  const [abierto, setAbierto] = useState(false)
  const cancelar = useMutation({
    mutationFn: () => api(`/asistencias/${id}/cancelar/`, { method: "POST", body: { motivo } }),
    onSuccess: () => {
      toast.success("Solicitud cancelada")
      setAbierto(false)
      onDone()
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <AlertDialog open={abierto} onOpenChange={setAbierto}>
      <AlertDialogTrigger render={<Button variant="destructive" />}>
        <XIcon data-icon="inline-start" />
        Cancelar
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>¿Cancelar la asistencia?</AlertDialogTitle>
          <AlertDialogDescription>
            Se liberará el proveedor asignado. Esta acción no se puede deshacer.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Field>
          <FieldLabel htmlFor="motivo">Motivo</FieldLabel>
          <Textarea
            id="motivo"
            placeholder="Ej: El vehículo ya encendió"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
          />
        </Field>
        <AlertDialogFooter>
          <AlertDialogCancel>Volver</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={!motivo.trim() || cancelar.isPending}
            onClick={() => cancelar.mutate()}
          >
            {cancelar.isPending && <Spinner data-icon="inline-start" />}
            Cancelar asistencia
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function CalificarCard({ solicitud, onDone }: { solicitud: Solicitud; onDone: () => void }) {
  const [abierto, setAbierto] = useState(false)
  const [valor, setValor] = useState<string[]>([])
  const [comentario, setComentario] = useState("")
  const calificar = useMutation({
    mutationFn: () =>
      api(`/asistencias/${solicitud.id}/calificar/`, {
        method: "POST",
        body: { calificacion: Number(valor[0]), comentario },
      }),
    onSuccess: () => {
      toast.success("¡Gracias por calificar!")
      setAbierto(false)
      onDone()
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  if (solicitud.calificacion) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Tu calificación</CardTitle>
          <CardDescription>{solicitud.comentario_calificacion || "Sin comentarios"}</CardDescription>
          <CardAction className="flex items-center gap-1 text-lg font-semibold">
            <StarIcon />
            {solicitud.calificacion} / 5
          </CardAction>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>¿Cómo fue el servicio?</CardTitle>
        <CardDescription>Tu calificación nos ayuda a asignar mejores proveedores.</CardDescription>
        <CardAction>
          <Dialog open={abierto} onOpenChange={setAbierto}>
            <DialogTrigger render={<Button />}>
              <StarIcon data-icon="inline-start" />
              Calificar
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Calificar servicio</DialogTitle>
                <DialogDescription>{solicitud.proveedor?.nombre}</DialogDescription>
              </DialogHeader>
              <FieldGroup>
                <Field>
                  <FieldLabel>Calificación</FieldLabel>
                  <ToggleGroup value={valor} onValueChange={(v) => setValor(v as string[])} variant="outline">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <ToggleGroupItem key={n} value={String(n)} aria-label={`${n} estrellas`}>
                        {n} <StarIcon />
                      </ToggleGroupItem>
                    ))}
                  </ToggleGroup>
                </Field>
                <Field>
                  <FieldLabel htmlFor="comentario">Comentario (opcional)</FieldLabel>
                  <Textarea id="comentario" value={comentario} onChange={(e) => setComentario(e.target.value)} />
                </Field>
              </FieldGroup>
              <DialogFooter>
                <Button disabled={!valor.length || calificar.isPending} onClick={() => calificar.mutate()}>
                  {calificar.isPending && <Spinner data-icon="inline-start" />}
                  Enviar calificación
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardAction>
      </CardHeader>
    </Card>
  )
}
