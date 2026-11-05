import { useState, type FormEvent } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { PlusIcon, SearchIcon } from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, errorCampo } from "@/components/comunes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
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
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { usePolizas, useTiposServicio } from "@/hooks/use-datos"
import { api } from "@/lib/api"
import { formatFecha } from "@/lib/format"
import type { Poliza } from "@/lib/types"

export function GestionPolizasPage() {
  const [busqueda, setBusqueda] = useState("")
  const [pagina, setPagina] = useState(1)
  const polizas = usePolizas({ search: busqueda, page: pagina })

  return (
    <>
      <Encabezado
        titulo="Pólizas"
        descripcion="Pólizas cargadas por la aseguradora. El asegurado las vincula al registrarse."
        acciones={<CrearPolizaDialog />}
      />
      <Card>
        <CardHeader>
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Número, titular, documento o placa"
              value={busqueda}
              onChange={(e) => {
                setBusqueda(e.target.value)
                setPagina(1)
              }}
            />
          </InputGroup>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <ErrorAlert error={polizas.error} />
          {polizas.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número</TableHead>
                  <TableHead>Titular</TableHead>
                  <TableHead>Vehículo</TableHead>
                  <TableHead>Vigencia</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Cuenta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {polizas.data?.results.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      No hay pólizas.
                    </TableCell>
                  </TableRow>
                )}
                {polizas.data?.results.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.numero}</TableCell>
                    <TableCell>
                      <div className="flex flex-col">
                        <span>{p.titular_nombre}</span>
                        <span className="text-xs text-muted-foreground">{p.titular_documento}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.placa} {[p.marca, p.linea, p.modelo].filter(Boolean).join(" ")}
                    </TableCell>
                    <TableCell>
                      {formatFecha(p.fecha_inicio)} – {formatFecha(p.fecha_fin)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.vigente ? "default" : "destructive"}>{p.vigente ? "Vigente" : "No vigente"}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={p.asegurado ? "secondary" : "outline"}>
                        {p.asegurado ? "Vinculada" : "Sin vincular"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={!polizas.data?.previous} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!polizas.data?.next} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  )
}

const hoy = () => new Date().toISOString().slice(0, 10)
const enUnAnio = () => {
  const d = new Date()
  d.setFullYear(d.getFullYear() + 1)
  return d.toISOString().slice(0, 10)
}

function CrearPolizaDialog() {
  const queryClient = useQueryClient()
  const tipos = useTiposServicio()
  const [abierto, setAbierto] = useState(false)
  const [form, setForm] = useState({
    numero: "",
    titular_nombre: "",
    titular_documento: "",
    placa: "",
    marca: "",
    linea: "",
    modelo: "",
    fecha_inicio: hoy(),
    fecha_fin: enUnAnio(),
  })
  const [servicios, setServicios] = useState<number[] | null>(null)
  const seleccionados = servicios ?? tipos.data?.map((t) => t.id) ?? []

  const crear = useMutation({
    mutationFn: () =>
      api<Poliza>("/polizas/", {
        method: "POST",
        body: {
          ...form,
          modelo: form.modelo ? Number(form.modelo) : null,
          activa: true,
          servicios_cubiertos: seleccionados,
        },
      }),
    onSuccess: (p) => {
      toast.success(`Póliza ${p.numero} creada`)
      queryClient.invalidateQueries({ queryKey: ["polizas"] })
      setAbierto(false)
    },
  })

  const campo = (id: keyof typeof form, label: string, props: React.ComponentProps<typeof Input> = {}) => {
    const err = errorCampo(crear.error, id)
    return (
      <Field data-invalid={Boolean(err) || undefined}>
        <FieldLabel htmlFor={`pol-${id}`}>{label}</FieldLabel>
        <Input
          id={`pol-${id}`}
          value={form[id]}
          onChange={(e) => setForm((f) => ({ ...f, [id]: e.target.value }))}
          aria-invalid={Boolean(err) || undefined}
          {...props}
        />
        <FieldError>{err}</FieldError>
      </Field>
    )
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    crear.mutate()
  }

  return (
    <Dialog open={abierto} onOpenChange={setAbierto}>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        Nueva póliza
      </DialogTrigger>
      <DialogContent className="max-h-[90svh] overflow-y-auto sm:max-w-2xl">
        <form onSubmit={onSubmit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Nueva póliza</DialogTitle>
            <DialogDescription>El asegurado podrá registrarse con este número y su documento.</DialogDescription>
          </DialogHeader>
          <ErrorAlert error={crear.error} />
          <FieldGroup>
            <div className="grid gap-4 sm:grid-cols-3">
              {campo("numero", "Número", { required: true })}
              {campo("titular_nombre", "Titular", { required: true })}
              {campo("titular_documento", "Documento titular", { required: true })}
            </div>
            <div className="grid gap-4 sm:grid-cols-4">
              {campo("placa", "Placa")}
              {campo("marca", "Marca")}
              {campo("linea", "Línea")}
              {campo("modelo", "Modelo", { type: "number", min: 1950, max: 2100 })}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {campo("fecha_inicio", "Inicio de vigencia", { type: "date", required: true })}
              {campo("fecha_fin", "Fin de vigencia", { type: "date", required: true })}
            </div>
            <FieldSet>
              <FieldLegend variant="label">Servicios cubiertos</FieldLegend>
              <div className="grid gap-3 sm:grid-cols-2">
                {tipos.data?.map((t) => (
                  <Field key={t.id} orientation="horizontal">
                    <Checkbox
                      id={`srv-${t.id}`}
                      checked={seleccionados.includes(t.id)}
                      onCheckedChange={(v) =>
                        setServicios(v ? [...seleccionados, t.id] : seleccionados.filter((x) => x !== t.id))
                      }
                    />
                    <FieldLabel htmlFor={`srv-${t.id}`} className="font-normal">
                      {t.nombre}
                    </FieldLabel>
                  </Field>
                ))}
              </div>
            </FieldSet>
          </FieldGroup>
          <DialogFooter>
            <Button type="submit" disabled={crear.isPending}>
              {crear.isPending && <Spinner data-icon="inline-start" />}
              Crear póliza
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
