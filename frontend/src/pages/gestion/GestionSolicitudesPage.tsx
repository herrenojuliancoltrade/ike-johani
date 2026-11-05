import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import {
  EllipsisIcon,
  EyeIcon,
  ListOrderedIcon,
  RefreshCwIcon,
  RepeatIcon,
  SearchIcon,
  XIcon,
} from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, EstadoBadge, mensajeError, ServicioIcono } from "@/components/comunes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api, POLLING_MS } from "@/lib/api"
import { ESTADOS, formatFechaHora, formatHora } from "@/lib/format"
import type { Candidato, Estado, Paginated, SolicitudGestion } from "@/lib/types"

const FILTRO_ESTADOS = [
  { value: null, label: "Todos los estados" },
  ...Object.entries(ESTADOS).map(([value, label]) => ({ value, label })),
]

export function GestionSolicitudesPage() {
  const queryClient = useQueryClient()
  const [estado, setEstado] = useState<string | null>(null)
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)
  const [detalle, setDetalle] = useState<SolicitudGestion | null>(null)
  const [candidatosDe, setCandidatosDe] = useState<SolicitudGestion | null>(null)

  const solicitudes = useQuery({
    queryKey: ["gestion", "solicitudes", estado, busqueda, pagina],
    queryFn: () =>
      api<Paginated<SolicitudGestion>>("/asistencias/", {
        params: { estado, search: busqueda, page: pagina },
      }),
    refetchInterval: POLLING_MS,
  })

  const refrescar = () => queryClient.invalidateQueries({ queryKey: ["gestion"] })

  const accion = useMutation({
    mutationFn: ({ id, tipo, motivo }: { id: number; tipo: "reasignar" | "reintentar" | "cancelar"; motivo?: string }) =>
      api<SolicitudGestion>(`/asistencias/${id}/${tipo}/`, { method: "POST", body: motivo ? { motivo } : {} }),
    onSuccess: (s) => {
      toast.success(`Solicitud #${s.id}: ${s.estado_display}`)
      refrescar()
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  const datos = solicitudes.data?.results ?? []
  const conteo = (e: Estado) => datos.filter((s) => s.estado === e).length

  return (
    <>
      <Encabezado
        titulo="Solicitudes de asistencia"
        descripcion="Monitorea las asignaciones automáticas y gestiona excepciones."
        acciones={
          <Button variant="outline" onClick={refrescar}>
            <RefreshCwIcon data-icon="inline-start" />
            Actualizar
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <Card size="sm">
          <CardHeader>
            <CardDescription>Total (filtro actual)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{solicitudes.data?.count ?? "—"}</CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>En atención (esta página)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {conteo("ASIGNADA") + conteo("EN_CAMINO") + conteo("EN_SITIO") + conteo("EN_PROCESO")}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card size="sm">
          <CardHeader>
            <CardDescription>Sin proveedor (esta página)</CardDescription>
            <CardTitle className="text-2xl tabular-nums">{conteo("SIN_PROVEEDOR")}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-2">
            <InputGroup className="min-w-60 flex-1">
              <InputGroupAddon>
                <SearchIcon />
              </InputGroupAddon>
              <InputGroupInput
                placeholder="Buscar por póliza, documento, dirección…"
                value={busqueda}
                onChange={(e) => {
                  setBusqueda(e.target.value)
                  setPagina(1)
                }}
              />
            </InputGroup>
            <Select
              items={FILTRO_ESTADOS}
              value={estado}
              onValueChange={(v) => {
                setEstado(v as string | null)
                setPagina(1)
              }}
            >
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  {FILTRO_ESTADOS.map((e) => (
                    <SelectItem key={e.value ?? "todos"} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert error={solicitudes.error} />
          {solicitudes.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Servicio</TableHead>
                  <TableHead>Asegurado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>ETA</TableHead>
                  <TableHead>Creada</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {datos.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No hay solicitudes con este filtro.
                    </TableCell>
                  </TableRow>
                )}
                {datos.map((s) => {
                  return (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.id}</TableCell>
                      <TableCell>
                        <span className="flex items-center gap-2">
                          <ServicioIcono codigo={s.tipo_servicio} className="text-muted-foreground" />
                          {s.tipo_servicio_nombre}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{s.asegurado_nombre}</span>
                          <span className="text-xs text-muted-foreground">{s.poliza_numero}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <EstadoBadge estado={s.estado} />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span>{s.proveedor?.nombre ?? "—"}</span>
                          {s.tecnico && <span className="text-xs text-muted-foreground">{s.tecnico.nombre}</span>}
                        </div>
                      </TableCell>
                      <TableCell>
                        {s.eta_minutos !== null && ["ASIGNADA", "EN_CAMINO"].includes(s.estado)
                          ? `${s.eta_minutos} min (${formatHora(s.hora_estimada_llegada)})`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatFechaHora(s.creado)}</TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" aria-label="Acciones" />}>
                            <EllipsisIcon />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuGroup>
                              <DropdownMenuItem onClick={() => setDetalle(s)}>
                                <EyeIcon />
                                Ver detalle
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => setCandidatosDe(s)}>
                                <ListOrderedIcon />
                                Ver candidatos
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                            <DropdownMenuSeparator />
                            <DropdownMenuGroup>
                              <DropdownMenuItem
                                disabled={s.estado !== "ASIGNADA"}
                                onClick={() => accion.mutate({ id: s.id, tipo: "reasignar", motivo: "Reasignado por operador" })}
                              >
                                <RepeatIcon />
                                Reasignar proveedor
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={s.estado !== "SIN_PROVEEDOR"}
                                onClick={() => accion.mutate({ id: s.id, tipo: "reintentar" })}
                              >
                                <RefreshCwIcon />
                                Reintentar asignación
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                variant="destructive"
                                disabled={["FINALIZADA", "CANCELADA", "EN_PROCESO"].includes(s.estado)}
                                onClick={() => accion.mutate({ id: s.id, tipo: "cancelar", motivo: "Cancelado por la aseguradora" })}
                              >
                                <XIcon />
                                Cancelar
                              </DropdownMenuItem>
                            </DropdownMenuGroup>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Página {pagina}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={!solicitudes.data?.previous} onClick={() => setPagina((p) => p - 1)}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" disabled={!solicitudes.data?.next} onClick={() => setPagina((p) => p + 1)}>
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <DetalleDialog solicitud={detalle} onClose={() => setDetalle(null)} />
      <CandidatosDialog solicitud={candidatosDe} onClose={() => setCandidatosDe(null)} />
    </>
  )
}

function DetalleDialog({ solicitud: s, onClose }: { solicitud: SolicitudGestion | null; onClose: () => void }) {
  return (
    <Dialog open={Boolean(s)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        {s && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {s.tipo_servicio_nombre} #{s.id} <EstadoBadge estado={s.estado} />
              </DialogTitle>
              <DialogDescription>
                {s.asegurado_nombre} (doc. {s.asegurado_documento}) · Póliza {s.poliza_numero} · {s.vehiculo.placa}
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col gap-4 text-sm">
              <p className="whitespace-pre-line">{s.descripcion}</p>
              <p className="text-muted-foreground">
                {s.direccion || "Ubicación GPS"} ({s.latitud}, {s.longitud})
                {s.destino_direccion && ` → ${s.destino_direccion}`}
              </p>
              <span className="font-medium">Intentos de asignación</span>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Proveedor</TableHead>
                    <TableHead>Distancia</TableHead>
                    <TableHead>Puntaje</TableHead>
                    <TableHead>Resultado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.intentos.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground">
                        Sin intentos
                      </TableCell>
                    </TableRow>
                  )}
                  {s.intentos.map((i, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{i.proveedor_nombre}</TableCell>
                      <TableCell>{Number(i.distancia_km).toFixed(1)} km</TableCell>
                      <TableCell>{Number(i.puntaje).toFixed(2)}</TableCell>
                      <TableCell>
                        <Badge variant={i.resultado === "ASIGNADO" ? "default" : "secondary"}>{i.resultado}</Badge>
                        {i.motivo && <span className="ml-2 text-xs text-muted-foreground">{i.motivo}</span>}
                      </TableCell>
                      <TableCell className="text-muted-foreground">{formatFechaHora(i.fecha)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function CandidatosDialog({ solicitud: s, onClose }: { solicitud: SolicitudGestion | null; onClose: () => void }) {
  const candidatos = useQuery({
    queryKey: ["gestion", "candidatos", s?.id],
    queryFn: () => api<Candidato[]>(`/asistencias/${s!.id}/candidatos/`),
    enabled: Boolean(s),
  })

  return (
    <Dialog open={Boolean(s)} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Candidatos para la solicitud #{s?.id}</DialogTitle>
          <DialogDescription>
            Ranking actual del motor de asignación (menor puntaje = mejor). Excluye proveedores que ya rechazaron.
          </DialogDescription>
        </DialogHeader>
        <ErrorAlert error={candidatos.error} />
        {candidatos.isPending ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>Proveedor</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Distancia</TableHead>
                <TableHead>ETA</TableHead>
                <TableHead>Carga</TableHead>
                <TableHead>Puntaje</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {candidatos.data?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="h-16 text-center text-muted-foreground">
                    No hay proveedores disponibles en este momento.
                  </TableCell>
                </TableRow>
              )}
              {candidatos.data?.map((c, i) => (
                <TableRow key={c.proveedor_id}>
                  <TableCell>{i + 1}</TableCell>
                  <TableCell className="font-medium">{c.proveedor}</TableCell>
                  <TableCell>{c.tecnico ?? "—"}</TableCell>
                  <TableCell>{c.distancia_km.toFixed(1)} km</TableCell>
                  <TableCell>{c.eta_minutos} min</TableCell>
                  <TableCell>{c.carga_actual}</TableCell>
                  <TableCell>{c.puntaje.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  )
}
