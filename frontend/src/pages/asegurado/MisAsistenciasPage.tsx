import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import { ChevronRightIcon, ClockIcon, LifeBuoyIcon, PlusIcon } from "lucide-react"

import { Encabezado, ErrorAlert, EstadoBadge, ServicioIcono } from "@/components/comunes"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { api, POLLING_MS } from "@/lib/api"
import { formatFechaHora, formatHora } from "@/lib/format"
import type { Paginated, Solicitud } from "@/lib/types"

function ListaSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  return (
    <ItemGroup>
      {solicitudes.map((s) => {
        return (
          <Item key={s.id} variant="outline" render={<Link to={`/asistencias/${s.id}`} />}>
            <ItemMedia variant="icon">
              <ServicioIcono codigo={s.tipo_servicio} />
            </ItemMedia>
            <ItemContent>
              <ItemTitle>
                {s.tipo_servicio_nombre}
                <EstadoBadge estado={s.estado} />
              </ItemTitle>
              <ItemDescription>
                #{s.id} · {formatFechaHora(s.creado)}
                {s.proveedor ? ` · ${s.proveedor.nombre}` : ""}
              </ItemDescription>
            </ItemContent>
            <ItemActions>
              {s.eta_minutos !== null && ["ASIGNADA", "EN_CAMINO"].includes(s.estado) && (
                <span className="flex items-center gap-1 text-sm text-muted-foreground">
                  <ClockIcon />
                  Llega {formatHora(s.hora_estimada_llegada)}
                </span>
              )}
              <ChevronRightIcon />
            </ItemActions>
          </Item>
        )
      })}
    </ItemGroup>
  )
}

function Cargando() {
  return (
    <div className="flex flex-col gap-3">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  )
}

function SinSolicitudes({ titulo, descripcion }: { titulo: string; descripcion: string }) {
  return (
    <Empty className="border">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <LifeBuoyIcon />
        </EmptyMedia>
        <EmptyTitle>{titulo}</EmptyTitle>
        <EmptyDescription>{descripcion}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button render={<Link to="/asistencias/nueva" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" />
          Solicitar asistencia
        </Button>
      </EmptyContent>
    </Empty>
  )
}

export function MisAsistenciasPage() {
  const [pagina, setPagina] = useState(1)

  const activas = useQuery({
    queryKey: ["asistencias", "activas"],
    queryFn: () => api<Solicitud[]>("/asistencias/activas/"),
    refetchInterval: POLLING_MS,
  })

  const historial = useQuery({
    queryKey: ["asistencias", "historial", pagina],
    queryFn: () => api<Paginated<Solicitud>>("/asistencias/", { params: { page: pagina } }),
  })

  return (
    <>
      <Encabezado
        titulo="Mis asistencias"
        descripcion="Consulta el estado de tus servicios en tiempo real."
        acciones={
          <Button render={<Link to="/asistencias/nueva" />} nativeButton={false}>
            <PlusIcon data-icon="inline-start" />
            Solicitar asistencia
          </Button>
        }
      />
      <Tabs defaultValue="activas">
        <TabsList>
          <TabsTrigger value="activas">
            En curso {activas.data?.length ? `(${activas.data.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="historial">Historial</TabsTrigger>
        </TabsList>
        <TabsContent value="activas" className="pt-4">
          <ErrorAlert error={activas.error} />
          {activas.isPending ? (
            <Cargando />
          ) : activas.data?.length ? (
            <ListaSolicitudes solicitudes={activas.data} />
          ) : (
            <SinSolicitudes
              titulo="No tienes asistencias en curso"
              descripcion="Cuando solicites un servicio podrás seguirlo desde aquí."
            />
          )}
        </TabsContent>
        <TabsContent value="historial" className="flex flex-col gap-4 pt-4">
          <ErrorAlert error={historial.error} />
          {historial.isPending ? (
            <Cargando />
          ) : historial.data?.results.length ? (
            <>
              <ListaSolicitudes solicitudes={historial.data.results} />
              <div className="flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!historial.data.previous}
                  onClick={() => setPagina((p) => p - 1)}
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!historial.data.next}
                  onClick={() => setPagina((p) => p + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </>
          ) : (
            <SinSolicitudes
              titulo="Aún no has solicitado asistencias"
              descripcion="Tu historial de servicios aparecerá aquí."
            />
          )}
        </TabsContent>
      </Tabs>
    </>
  )
}
