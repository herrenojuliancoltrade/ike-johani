import { useState } from "react"
import { Link } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import {
  CarIcon,
  CheckIcon,
  ClockIcon,
  MapPinIcon,
  NavigationIcon,
  PhoneIcon,
  PlayIcon,
  UserIcon,
  XIcon,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"

import { EstadoBadge, mensajeError, ServicioIcono } from "@/components/comunes"
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
import { Field, FieldLabel } from "@/components/ui/field"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useTiposServicio } from "@/hooks/use-datos"
import { api } from "@/lib/api"
import { formatFechaHora, formatHora, urlMapa } from "@/lib/format"
import type { Estado, SolicitudGestion } from "@/lib/types"

export function ServicioProveedorCard({ s, enlace = true }: { s: SolicitudGestion; enlace?: boolean }) {
  const queryClient = useQueryClient()
  const tipos = useTiposServicio()
  const requiereDesplazamiento =
    tipos.data?.find((t) => t.codigo === s.tipo_servicio)?.requiere_desplazamiento ?? true

  const cambiar = useMutation({
    mutationFn: ({ estado, comentario = "" }: { estado: Estado; comentario?: string }) =>
      api<SolicitudGestion>(`/proveedor/asistencias/${s.id}/cambiar-estado/`, {
        method: "POST",
        body: { estado, comentario },
      }),
    onSuccess: (r) => {
      toast.success(`Servicio #${r.id}: ${r.estado_display}`)
      queryClient.invalidateQueries({ queryKey: ["proveedor"] })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const accion = (estado: Estado, label: string, Icon: LucideIcon) => (
    <Button onClick={() => cambiar.mutate({ estado })} disabled={cambiar.isPending}>
      {cambiar.isPending && cambiar.variables?.estado === estado ? (
        <Spinner data-icon="inline-start" />
      ) : (
        <Icon data-icon="inline-start" />
      )}
      {label}
    </Button>
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ServicioIcono codigo={s.tipo_servicio} />
          {enlace ? <Link to={`/proveedor/${s.id}`}>{s.tipo_servicio_nombre} #{s.id}</Link> : `${s.tipo_servicio_nombre} #${s.id}`}
        </CardTitle>
        <CardDescription>
          Asignado {formatFechaHora(s.asignado_en ?? s.creado)}
          {s.tecnico ? ` · Técnico: ${s.tecnico.nombre}` : ""}
        </CardDescription>
        <CardAction>
          <EstadoBadge estado={s.estado} />
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <p className="whitespace-pre-line">{s.descripcion}</p>
        <Separator />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-start gap-2">
            <UserIcon className="mt-0.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{s.asegurado_nombre}</span>
              <a href={`tel:${s.telefono_contacto}`} className="text-muted-foreground underline-offset-4 hover:underline">
                {s.telefono_contacto}
              </a>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <CarIcon className="mt-0.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">
                {[s.vehiculo.marca, s.vehiculo.linea, s.vehiculo.modelo].filter(Boolean).join(" ") || "Vehículo"}
              </span>
              <span className="text-muted-foreground">
                {s.vehiculo.placa} {s.vehiculo.color && `· ${s.vehiculo.color}`}
              </span>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <MapPinIcon className="mt-0.5 text-muted-foreground" />
            <div className="flex flex-col">
              <span className="font-medium">{s.direccion || "Ubicación GPS"}</span>
              <span className="text-muted-foreground">{s.referencia}</span>
            </div>
          </div>
          {s.destino_direccion && (
            <div className="flex items-start gap-2">
              <NavigationIcon className="mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">Destino</span>
                <span className="text-muted-foreground">{s.destino_direccion}</span>
              </div>
            </div>
          )}
          {s.eta_minutos !== null && ["ASIGNADA", "EN_CAMINO"].includes(s.estado) && (
            <div className="flex items-start gap-2">
              <ClockIcon className="mt-0.5 text-muted-foreground" />
              <div className="flex flex-col">
                <span className="font-medium">ETA {s.eta_minutos} min</span>
                <span className="text-muted-foreground">
                  Llegada {formatHora(s.hora_estimada_llegada)}
                  {s.distancia_km ? ` · ${Number(s.distancia_km).toFixed(1)} km` : ""}
                </span>
              </div>
            </div>
          )}
        </div>
      </CardContent>
      {!["FINALIZADA", "CANCELADA"].includes(s.estado) && (
        <CardFooter className="flex flex-wrap gap-2">
          {s.estado === "ASIGNADA" &&
            (requiereDesplazamiento
              ? accion("EN_CAMINO", "Salir hacia el sitio", NavigationIcon)
              : accion("EN_PROCESO", "Iniciar atención", PlayIcon))}
          {s.estado === "EN_CAMINO" && accion("EN_SITIO", "Llegué al sitio", MapPinIcon)}
          {s.estado === "EN_SITIO" && accion("EN_PROCESO", "Iniciar servicio", PlayIcon)}
          {["EN_SITIO", "EN_PROCESO"].includes(s.estado) && (
            <FinalizarDialog
              onConfirm={(comentario) => cambiar.mutate({ estado: "FINALIZADA", comentario })}
              pendiente={cambiar.isPending}
            />
          )}
          {s.estado === "ASIGNADA" && <RechazarDialog id={s.id} />}
          <Button
            variant="outline"
            render={<a href={urlMapa(s.latitud, s.longitud)} target="_blank" rel="noreferrer" />}
            nativeButton={false}
          >
            <MapPinIcon data-icon="inline-start" />
            Abrir en mapa
          </Button>
          <Button variant="ghost" render={<a href={`tel:${s.telefono_contacto}`} />} nativeButton={false}>
            <PhoneIcon data-icon="inline-start" />
            Llamar
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function FinalizarDialog({ onConfirm, pendiente }: { onConfirm: (comentario: string) => void; pendiente: boolean }) {
  const [abierto, setAbierto] = useState(false)
  const [comentario, setComentario] = useState("")
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="secondary" />}>
        <CheckIcon data-icon="inline-start" />
        Finalizar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Finalizar servicio</DialogTitle>
          <DialogDescription>Describe brevemente el trabajo realizado.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="obs">Observaciones</FieldLabel>
          <Textarea id="obs" value={comentario} onChange={(e) => setComentario(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button
            disabled={pendiente}
            onClick={() => {
              onConfirm(comentario)
              setAbierto(false)
            }}
          >
            Confirmar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function RechazarDialog({ id }: { id: number }) {
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [motivo, setMotivo] = useState("")
  const rechazar = useMutation({
    mutationFn: () => api(`/proveedor/asistencias/${id}/rechazar/`, { method: "POST", body: { motivo } }),
    onSuccess: () => {
      toast.success("Servicio rechazado. Se reasignará a otro proveedor.")
      setAbierto(false)
      queryClient.invalidateQueries({ queryKey: ["proveedor"] })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })
  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button variant="destructive" />}>
        <XIcon data-icon="inline-start" />
        Rechazar
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar servicio #{id}</DialogTitle>
          <DialogDescription>El sistema lo asignará automáticamente al siguiente proveedor disponible.</DialogDescription>
        </DialogHeader>
        <Field>
          <FieldLabel htmlFor="motivo-rechazo">Motivo</FieldLabel>
          <Textarea id="motivo-rechazo" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </Field>
        <DialogFooter>
          <Button variant="destructive" disabled={!motivo.trim() || rechazar.isPending} onClick={() => rechazar.mutate()}>
            {rechazar.isPending && <Spinner data-icon="inline-start" />}
            Rechazar servicio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
