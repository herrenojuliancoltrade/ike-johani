import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CarIcon, LinkIcon, ShieldCheckIcon, ShieldOffIcon } from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, errorCampo, ServicioTile } from "@/components/comunes"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
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
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { usePolizas } from "@/hooks/use-datos"
import { api } from "@/lib/api"
import { formatFecha } from "@/lib/format"
import type { Poliza } from "@/lib/types"
import { cn } from "@/lib/utils"

export function MisPolizasPage() {
  const polizas = usePolizas()

  return (
    <>
      <Encabezado
        antetitulo="Cobertura"
        titulo="Mis pólizas"
        descripcion="Pólizas vinculadas a tu cuenta y servicios cubiertos."
        acciones={<VincularDialog />}
      />
      <ErrorAlert error={polizas.error} />
      {polizas.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      ) : polizas.data?.results.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {polizas.data.results.map((p) => (
            <PolizaCard key={p.id} poliza={p} />
          ))}
        </div>
      ) : (
        <Empty className="border border-dashed bg-card">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ShieldCheckIcon />
            </EmptyMedia>
            <EmptyTitle>No tienes pólizas vinculadas</EmptyTitle>
            <EmptyDescription>Vincula tu póliza con el número que aparece en la carátula.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}

function PolizaCard({ poliza: p }: { poliza: Poliza }) {
  const vehiculo = [p.marca, p.linea, p.modelo].filter(Boolean).join(" ")
  return (
    <Card className="pt-0">
      <div
        className={cn(
          "relative overflow-hidden p-5 text-primary-foreground",
          p.vigente ? "bg-marca" : "bg-muted-foreground"
        )}
      >
        <div className="bg-trama pointer-events-none absolute inset-0 opacity-25" />
        <div className="relative flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium tracking-wider text-primary-foreground/75 uppercase">
              Póliza de asistencia
            </span>
            <span className="font-mono text-2xl font-semibold tracking-wide">{p.numero}</span>
          </div>
          <span className="flex items-center gap-1.5 rounded-full bg-primary-foreground/15 px-2.5 py-1 text-xs font-medium ring-1 ring-primary-foreground/25">
            {p.vigente ? <ShieldCheckIcon className="size-3.5" /> : <ShieldOffIcon className="size-3.5" />}
            {p.vigente ? "Vigente" : "No vigente"}
          </span>
        </div>
        <div className="relative mt-6 flex flex-wrap items-end justify-between gap-3 text-sm">
          <div className="flex flex-col">
            <span className="text-xs text-primary-foreground/70">Titular</span>
            <span className="font-medium">{p.titular_nombre}</span>
          </div>
          <div className="flex flex-col text-right">
            <span className="text-xs text-primary-foreground/70">Vigencia</span>
            <span className="font-medium">
              {formatFecha(p.fecha_inicio)} – {formatFecha(p.fecha_fin)}
            </span>
          </div>
        </div>
      </div>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CarIcon className="size-4 text-muted-foreground" />
          {vehiculo || "Vehículo"}
          {p.color && <span className="font-normal text-muted-foreground">· {p.color}</span>}
        </CardTitle>
        {p.max_asistencias_anuales > 0 && (
          <CardDescription>Hasta {p.max_asistencias_anuales} asistencias por año.</CardDescription>
        )}
        {p.placa && (
          <CardAction>
            <span className="rounded-md border-2 border-foreground/80 bg-warning px-2 py-0.5 font-mono text-sm font-bold tracking-widest text-warning-foreground">
              {p.placa}
            </span>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <span className="text-xs font-medium text-muted-foreground uppercase">Servicios cubiertos</span>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {p.servicios_cubiertos_detalle.map((s) => (
            <span key={s.id} className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 text-xs font-medium">
              <ServicioTile codigo={s.codigo} size="sm" />
              <span className="truncate">{s.nombre}</span>
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function VincularDialog() {
  const queryClient = useQueryClient()
  const [abierto, setAbierto] = useState(false)
  const [numero, setNumero] = useState("")
  const vincular = useMutation({
    mutationFn: () =>
      api<Poliza>("/polizas/vincular/", { method: "POST", body: { numero_poliza: numero } }),
    onSuccess: (p) => {
      toast.success(`Póliza ${p.numero} vinculada`)
      queryClient.invalidateQueries({ queryKey: ["polizas"] })
      setNumero("")
      setAbierto(false)
    },
  })
  const err = errorCampo(vincular.error, "numero_poliza")

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>
        <LinkIcon data-icon="inline-start" />
        Vincular póliza
      </DialogTrigger>
      <DialogContent>
        <form
          className="flex flex-col gap-4"
          onSubmit={(e) => {
            e.preventDefault()
            vincular.mutate()
          }}
        >
          <DialogHeader>
            <DialogTitle>Vincular póliza</DialogTitle>
            <DialogDescription>La póliza debe estar a nombre de tu documento.</DialogDescription>
          </DialogHeader>
          {!err && <ErrorAlert error={vincular.error} />}
          <Field data-invalid={Boolean(err) || undefined}>
            <FieldLabel htmlFor="numero">Número de póliza</FieldLabel>
            <Input
              id="numero"
              required
              placeholder="POL-0000"
              value={numero}
              onChange={(e) => setNumero(e.target.value)}
              aria-invalid={Boolean(err) || undefined}
            />
            <FieldError>{err}</FieldError>
          </Field>
          <DialogFooter>
            <Button type="submit" disabled={!numero.trim() || vincular.isPending}>
              {vincular.isPending && <Spinner data-icon="inline-start" />}
              Vincular
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
