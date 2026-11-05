import { useState } from "react"
import { Link } from "react-router"
import { useQuery } from "@tanstack/react-query"
import {
  ArrowRightIcon,
  BuildingIcon,
  ChevronRightIcon,
  ClockIcon,
  HistoryIcon,
  PlusIcon,
} from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import {
  ErrorAlert,
  EstadoBadge,
  Seccion,
  ServicioIcono,
  ServicioTile,
} from "@/components/comunes"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Empty,
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
import { api, POLLING_MS } from "@/lib/api"
import { formatFechaHora, formatHora, saludo } from "@/lib/format"
import type { CodigoServicio, Paginated, Solicitud } from "@/lib/types"

const ACCESOS_RAPIDOS: { codigo: CodigoServicio; nombre: string }[] = [
  { codigo: "GRUA", nombre: "Grúa" },
  { codigo: "CARRO_TALLER", nombre: "Carro taller" },
  { codigo: "PASO_CORRIENTE", nombre: "Batería" },
  { codigo: "CAMBIO_LLANTA", nombre: "Llanta" },
]

function Hero() {
  const { usuario } = useAuth()
  const nombre = usuario?.first_name || usuario?.nombre_completo?.split(" ")[0] || ""

  return (
    <section className="bg-marca relative overflow-hidden rounded-3xl p-6 text-primary-foreground shadow-xl shadow-primary/20 md:p-8">
      <div className="bg-trama pointer-events-none absolute inset-0 opacity-25" />
      <div className="pointer-events-none absolute -top-20 -right-16 size-72 rounded-full bg-primary-foreground/10 blur-2xl" />
      <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex max-w-xl flex-col gap-2">
          <span className="text-sm font-medium text-primary-foreground/80">
            {saludo()}
            {nombre ? `, ${nombre}` : ""}
          </span>
          <h1 className="text-3xl font-semibold md:text-4xl">¿Necesitas ayuda en la vía?</h1>
          <p className="text-primary-foreground/80">
            Te asignamos el proveedor más cercano y sigues su llegada en tiempo real.
          </p>
          <div className="pt-2">
            <Button
              size="lg"
              variant="secondary"
              render={<Link to="/asistencias/nueva" />}
              nativeButton={false}
            >
              <PlusIcon data-icon="inline-start" />
              Solicitar asistencia
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 sm:gap-3">
          {ACCESOS_RAPIDOS.map((a) => (
            <Link
              key={a.codigo}
              to={`/asistencias/nueva?servicio=${a.codigo}`}
              className="flex flex-col items-center gap-2 rounded-2xl bg-primary-foreground/12 p-3 text-center text-xs font-medium ring-1 ring-primary-foreground/15 transition-colors hover:bg-primary-foreground/20 sm:w-24"
            >
              <span className="flex size-10 items-center justify-center rounded-xl bg-primary-foreground text-primary">
                <ServicioIcono codigo={a.codigo} className="size-5" />
              </span>
              {a.nombre}
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

/** Tarjeta destacada de una asistencia en curso. */
function ActivaCard({ s }: { s: Solicitud }) {
  const enRuta = s.eta_minutos !== null && ["ASIGNADA", "EN_CAMINO"].includes(s.estado)
  return (
    <Card className="transition-shadow hover:shadow-md">
      <CardHeader className="flex flex-row items-center gap-3">
        <ServicioTile codigo={s.tipo_servicio} size="lg" />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <CardTitle className="truncate text-base">{s.tipo_servicio_nombre}</CardTitle>
          <EstadoBadge estado={s.estado} />
        </div>
        {enRuta && (
          <div className="flex flex-col items-end">
            <span className="text-3xl leading-none font-semibold text-primary tabular-nums">
              {s.eta_minutos}
              <span className="text-base font-medium"> min</span>
            </span>
            <span className="text-xs text-muted-foreground">
              llega {formatHora(s.hora_estimada_llegada)}
            </span>
          </div>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <BuildingIcon className="size-4" />
          {s.proveedor?.nombre ?? "Buscando el proveedor más cercano…"}
        </span>
        <span className="flex items-center gap-2">
          <ClockIcon className="size-4" />
          Solicitada {formatFechaHora(s.creado)}
        </span>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full"
          render={<Link to={`/asistencias/${s.id}`} />}
          nativeButton={false}
        >
          Ver seguimiento
          <ArrowRightIcon data-icon="inline-end" />
        </Button>
      </CardFooter>
    </Card>
  )
}

function ListaSolicitudes({ solicitudes }: { solicitudes: Solicitud[] }) {
  return (
    <ItemGroup className="gap-2">
      {solicitudes.map((s) => (
        <Item
          key={s.id}
          variant="outline"
          className="bg-card"
          render={<Link to={`/asistencias/${s.id}`} />}
        >
          <ItemMedia>
            <ServicioTile codigo={s.tipo_servicio} />
          </ItemMedia>
          <ItemContent>
            <ItemTitle>{s.tipo_servicio_nombre}</ItemTitle>
            <ItemDescription>
              #{s.id} · {formatFechaHora(s.creado)}
              {s.proveedor ? ` · ${s.proveedor.nombre}` : ""}
            </ItemDescription>
          </ItemContent>
          <ItemActions>
            <EstadoBadge estado={s.estado} className="hidden sm:inline-flex" />
            <ChevronRightIcon className="text-muted-foreground" />
          </ItemActions>
        </Item>
      ))}
    </ItemGroup>
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
      <Hero />

      {(activas.isPending || activas.error || (activas.data?.length ?? 0) > 0) && (
        <Seccion titulo="En curso" descripcion="Se actualiza automáticamente.">
          <ErrorAlert error={activas.error} />
          {activas.isPending ? (
            <div className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-52" />
              <Skeleton className="h-52" />
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {activas.data?.map((s) => <ActivaCard key={s.id} s={s} />)}
            </div>
          )}
        </Seccion>
      )}

      <Seccion
        titulo="Historial"
        descripcion={
          historial.data
            ? `${historial.data.count} ${historial.data.count === 1 ? "solicitud" : "solicitudes"} en total`
            : undefined
        }
      >
        <ErrorAlert error={historial.error} />
        {historial.isPending ? (
          <div className="flex flex-col gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : historial.data?.results.length ? (
          <>
            <ListaSolicitudes solicitudes={historial.data.results} />
            {(historial.data.previous || historial.data.next) && (
              <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
                <span>Página {pagina}</span>
                <div className="flex gap-2">
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
              </div>
            )}
          </>
        ) : (
          <Empty className="border border-dashed bg-card">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <HistoryIcon />
              </EmptyMedia>
              <EmptyTitle>Aún no has solicitado asistencias</EmptyTitle>
              <EmptyDescription>
                Cuando pidas un servicio, aquí verás su estado y tu historial.
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        )}
      </Seccion>
    </>
  )
}
