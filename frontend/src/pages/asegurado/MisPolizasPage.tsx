import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { CarIcon, LinkIcon, ShieldCheckIcon } from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, errorCampo, ServicioIcono } from "@/components/comunes"
import { Badge } from "@/components/ui/badge"
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

export function MisPolizasPage() {
  const polizas = usePolizas()

  return (
    <>
      <Encabezado
        titulo="Mis pólizas"
        descripcion="Pólizas vinculadas a tu cuenta y servicios cubiertos."
        acciones={<VincularDialog />}
      />
      <ErrorAlert error={polizas.error} />
      {polizas.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-56" />
          <Skeleton className="h-56" />
        </div>
      ) : polizas.data?.results.length ? (
        <div className="grid gap-4 md:grid-cols-2">
          {polizas.data.results.map((p) => (
            <PolizaCard key={p.id} poliza={p} />
          ))}
        </div>
      ) : (
        <Empty className="border">
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
  return (
    <Card>
      <CardHeader>
        <CardTitle>Póliza {p.numero}</CardTitle>
        <CardDescription>
          {p.titular_nombre} · Vigencia {formatFecha(p.fecha_inicio)} – {formatFecha(p.fecha_fin)}
        </CardDescription>
        <CardAction>
          <Badge variant={p.vigente ? "default" : "destructive"}>{p.vigente ? "Vigente" : "No vigente"}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex items-center gap-2 text-sm">
          <CarIcon className="text-muted-foreground" />
          <span>
            {[p.marca, p.linea, p.modelo].filter(Boolean).join(" ")} {p.color && `· ${p.color}`}
          </span>
          {p.placa && <Badge variant="outline">{p.placa}</Badge>}
        </div>
        <div className="flex flex-wrap gap-2">
          {p.servicios_cubiertos_detalle.map((s) => {
            return (
              <Badge key={s.id} variant="secondary">
                <ServicioIcono codigo={s.codigo} data-icon="inline-start" />
                {s.nombre}
              </Badge>
            )
          })}
        </div>
      </CardContent>
      {p.max_asistencias_anuales > 0 && (
        <CardFooter className="text-sm text-muted-foreground">
          Máximo {p.max_asistencias_anuales} asistencias por año.
        </CardFooter>
      )}
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
