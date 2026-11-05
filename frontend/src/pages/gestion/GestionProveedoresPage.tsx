import { useState } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { SearchIcon, StarIcon } from "lucide-react"
import { toast } from "sonner"

import { Encabezado, ErrorAlert, mensajeError, ServicioIcono } from "@/components/comunes"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { api } from "@/lib/api"
import type { Paginated, Proveedor } from "@/lib/types"

export function GestionProveedoresPage() {
  const queryClient = useQueryClient()
  const [busqueda, setBusqueda] = useState("")

  const proveedores = useQuery({
    queryKey: ["gestion", "proveedores", busqueda],
    queryFn: () => api<Paginated<Proveedor>>("/proveedores/", { params: { search: busqueda, page_size: 100 } }),
  })

  const actualizar = useMutation({
    mutationFn: ({ id, ...body }: { id: number; disponible?: boolean; activo?: boolean }) =>
      api<Proveedor>(`/proveedores/${id}/`, { method: "PATCH", body }),
    onSuccess: (p) => {
      toast.success(`${p.nombre}: ${p.disponible ? "recibiendo servicios" : "pausado"}`)
      queryClient.invalidateQueries({ queryKey: ["gestion", "proveedores"] })
    },
    onError: (e) => toast.error(mensajeError(e)),
  })

  return (
    <>
      <Encabezado
        antetitulo="Red de atención"
        titulo="Proveedores"
        descripcion="Red de proveedores que reciben asignaciones automáticas. Para crear o editar en detalle usa el admin de Django."
      />
      <Card>
        <CardHeader>
          <InputGroup className="max-w-sm">
            <InputGroupAddon>
              <SearchIcon />
            </InputGroupAddon>
            <InputGroupInput
              placeholder="Buscar por nombre, NIT o ciudad"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
            />
          </InputGroup>
        </CardHeader>
        <CardContent>
          <ErrorAlert error={proveedores.error} />
          {proveedores.isPending ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Proveedor</TableHead>
                  <TableHead>Servicios</TableHead>
                  <TableHead>Cobertura</TableHead>
                  <TableHead>Técnicos</TableHead>
                  <TableHead>Calificación</TableHead>
                  <TableHead>Recibe servicios</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {proveedores.data?.results.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">{p.nombre}</span>
                        <span className="text-xs text-muted-foreground">
                          NIT {p.nit} · {p.telefono}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex max-w-72 flex-wrap gap-1">
                        {p.servicios_detalle.map((s) => {
                          return (
                            <Badge key={s.id} variant="secondary">
                              <ServicioIcono codigo={s.codigo} data-icon="inline-start" />
                              {s.nombre}
                            </Badge>
                          )
                        })}
                      </div>
                    </TableCell>
                    <TableCell>
                      {p.ciudad} · {p.radio_cobertura_km} km
                    </TableCell>
                    <TableCell>{p.tecnicos_activos || `Cap. ${p.capacidad_simultanea}`}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1">
                        <StarIcon className="text-muted-foreground" />
                        {Number(p.calificacion).toFixed(1)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.disponible && p.activo}
                        disabled={!p.activo || actualizar.isPending}
                        onCheckedChange={(v) => actualizar.mutate({ id: p.id, disponible: v })}
                        aria-label={`Disponibilidad de ${p.nombre}`}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </>
  )
}
