import { useEffect, useRef, useState } from "react"
import { Link, useParams } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ArrowLeftIcon, ClipboardListIcon, MapPinIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { Encabezado, ErrorAlert, mensajeError } from "@/components/comunes"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, POLLING_MS } from "@/lib/api"
import { formatHora } from "@/lib/format"
import type { Paginated, SolicitudGestion } from "@/lib/types"
import { ServicioProveedorCard } from "@/pages/proveedor/ServicioProveedorCard"

const ENVIO_MINIMO_MS = 20000

/** Envía la ubicación del técnico al backend mientras el switch esté activo. */
function CompartirUbicacionCard({ tecnicoId }: { tecnicoId: number }) {
  const [activo, setActivo] = useState(false)
  const [ultimoEnvio, setUltimoEnvio] = useState<Date | null>(null)
  const ultimoRef = useRef(0)

  useEffect(() => {
    if (!activo || !("geolocation" in navigator)) return
    const watchId = navigator.geolocation.watchPosition(
      async (pos) => {
        if (Date.now() - ultimoRef.current < ENVIO_MINIMO_MS) return
        ultimoRef.current = Date.now()
        try {
          await api(`/tecnicos/${tecnicoId}/ubicacion/`, {
            method: "POST",
            body: {
              latitud: pos.coords.latitude.toFixed(6),
              longitud: pos.coords.longitude.toFixed(6),
            },
          })
          setUltimoEnvio(new Date())
        } catch (e) {
          toast.error(mensajeError(e))
        }
      },
      (err) => {
        toast.error(err.message || "No se pudo obtener la ubicación.")
        setActivo(false)
      },
      { enableHighAccuracy: true }
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [activo, tecnicoId])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPinIcon />
          Compartir mi ubicación
        </CardTitle>
        <CardDescription>
          {activo
            ? `El asegurado ve tu posición y el tiempo de llegada se recalcula. ${
                ultimoEnvio ? `Último envío: ${formatHora(ultimoEnvio.toISOString())}` : "Obteniendo ubicación…"
              }`
            : "Actívalo cuando vayas en camino para que el asegurado vea tu tiempo de llegada."}
        </CardDescription>
        <CardAction>
          <Switch
            checked={activo}
            onCheckedChange={(v) => {
              if (v && !("geolocation" in navigator)) {
                toast.error("Tu navegador no permite compartir la ubicación.")
                return
              }
              setActivo(v)
            }}
            aria-label="Compartir ubicación"
          />
        </CardAction>
      </CardHeader>
    </Card>
  )
}

function Lista({ datos }: { datos: SolicitudGestion[] }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {datos.map((s) => (
        <ServicioProveedorCard key={s.id} s={s} />
      ))}
    </div>
  )
}

function Vacio({ texto }: { texto: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <ClipboardListIcon />
        </EmptyMedia>
        <EmptyTitle>{texto}</EmptyTitle>
        <EmptyDescription>Los nuevos servicios aparecerán aquí automáticamente.</EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}

export function ServiciosProveedorPage() {
  const { usuario } = useAuth()
  const [pagina, setPagina] = useState(1)

  const activas = useQuery({
    queryKey: ["proveedor", "activas"],
    queryFn: () => api<SolicitudGestion[]>("/proveedor/asistencias/activas/"),
    refetchInterval: POLLING_MS,
  })
  const historial = useQuery({
    queryKey: ["proveedor", "historial", pagina],
    queryFn: () =>
      api<Paginated<SolicitudGestion>>("/proveedor/asistencias/", {
        params: { page: pagina, ordering: "-actualizado" },
      }),
  })

  return (
    <>
      <Encabezado
        titulo="Servicios asignados"
        descripcion={usuario?.proveedor_nombre ?? "Tu empresa"}
      />
      {usuario?.tecnico_id && <CompartirUbicacionCard tecnicoId={usuario.tecnico_id} />}
      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas">
            En curso {activas.data?.length ? `(${activas.data.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="historial">Todos</TabsTrigger>
        </TabsList>
        <TabsContent value="activas" className="pt-4">
          <ErrorAlert error={activas.error} />
          {activas.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : activas.data?.length ? (
            <Lista datos={activas.data} />
          ) : (
            <Vacio texto="No tienes servicios en curso" />
          )}
        </TabsContent>
        <TabsContent value="historial" className="flex flex-col gap-4 pt-4">
          <ErrorAlert error={historial.error} />
          {historial.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : historial.data?.results.length ? (
            <>
              <Lista datos={historial.data.results} />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" disabled={!historial.data.previous} onClick={() => setPagina((p) => p - 1)}>
                  Anterior
                </Button>
                <Button variant="outline" size="sm" disabled={!historial.data.next} onClick={() => setPagina((p) => p + 1)}>
                  Siguiente
                </Button>
              </div>
            </>
          ) : (
            <Vacio texto="Aún no tienes servicios" />
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}

export function DetalleServicioProveedorPage() {
  const { id } = useParams()
  const servicio = useQuery({
    queryKey: ["proveedor", "detalle", id],
    queryFn: () => api<SolicitudGestion>(`/proveedor/asistencias/${id}/`),
    refetchInterval: POLLING_MS,
  })

  return (
    <>
      <Encabezado
        titulo={`Servicio #${id}`}
        acciones={
          <Button variant="ghost" render={<Link to="/proveedor" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver
          </Button>
        }
      />
      <ErrorAlert error={servicio.error} titulo="No se pudo cargar el servicio" />
      {servicio.isPending ? (
        <Skeleton className="h-72 w-full" />
      ) : (
        servicio.data && <ServicioProveedorCard s={servicio.data} enlace={false} />
      )}
    </>
  )
}
