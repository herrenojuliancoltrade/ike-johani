import { useEffect, useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowLeftIcon, CrosshairIcon, MapPinIcon, SendIcon } from "lucide-react"
import { toast } from "sonner"

import { useAuth } from "@/auth/auth-context"
import { Encabezado, ErrorAlert, errorCampo, ServicioIcono } from "@/components/comunes"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { obtenerUbicacion, usePolizas, useTiposServicio } from "@/hooks/use-datos"
import { api } from "@/lib/api"
import { urlMapa } from "@/lib/format"
import type { Solicitud } from "@/lib/types"

interface Coordenadas {
  latitud: number
  longitud: number
  precision?: number
}

export function NuevaAsistenciaPage() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const tipos = useTiposServicio()
  const polizas = usePolizas()

  const [servicio, setServicio] = useState<string>("")
  const [polizaElegida, setPolizaId] = useState<string | null>(null)
  const [descripcion, setDescripcion] = useState("")
  const [direccion, setDireccion] = useState("")
  const [referencia, setReferencia] = useState("")
  const [telefono, setTelefono] = useState(usuario?.telefono ?? "")
  const [destino, setDestino] = useState("")
  const [coords, setCoords] = useState<Coordenadas | null>(null)
  const [ubicando, setUbicando] = useState(true)
  const [errorUbicacion, setErrorUbicacion] = useState<string | null>(null)
  const [manual, setManual] = useState({ latitud: "", longitud: "" })

  const polizasVigentes = useMemo(
    () => polizas.data?.results.filter((p) => p.vigente) ?? [],
    [polizas.data]
  )
  // Por defecto se usa la primera póliza vigente
  const polizaId = polizaElegida ?? (polizasVigentes[0] ? String(polizasVigentes[0].id) : null)
  const polizaItems = polizasVigentes.map((p) => ({
    value: String(p.id),
    label: `${p.numero} · ${p.placa || "sin placa"} ${p.marca} ${p.linea}`.trim(),
  }))
  const polizaSeleccionada = polizasVigentes.find((p) => String(p.id) === polizaId)
  const tipoSeleccionado = tipos.data?.find((t) => t.codigo === servicio)
  const noCubierto =
    polizaSeleccionada &&
    tipoSeleccionado &&
    !polizaSeleccionada.servicios_cubiertos_detalle.some((s) => s.id === tipoSeleccionado.id)

  const pedirUbicacion = () =>
    obtenerUbicacion()
      .then((pos) => {
        setErrorUbicacion(null)
        setCoords({
          latitud: pos.coords.latitude,
          longitud: pos.coords.longitude,
          precision: pos.coords.accuracy,
        })
      })
      .catch((err: Error) => setErrorUbicacion(err.message))
      .finally(() => setUbicando(false))

  const ubicar = () => {
    setUbicando(true)
    void pedirUbicacion()
  }

  // Intenta ubicar al usuario apenas abre el formulario
  useEffect(() => {
    void pedirUbicacion()
  }, [])

  const coordsFinales: Coordenadas | null =
    coords ??
    (manual.latitud && manual.longitud && !isNaN(+manual.latitud) && !isNaN(+manual.longitud)
      ? { latitud: +manual.latitud, longitud: +manual.longitud }
      : null)

  const crear = useMutation({
    mutationFn: () =>
      api<Solicitud>("/asistencias/", {
        method: "POST",
        body: {
          tipo_servicio: servicio,
          poliza: polizaId ? Number(polizaId) : undefined,
          descripcion,
          direccion,
          referencia,
          telefono_contacto: telefono,
          destino_direccion: destino,
          latitud: coordsFinales!.latitud.toFixed(6),
          longitud: coordsFinales!.longitud.toFixed(6),
        },
      }),
    onSuccess: (s) => {
      queryClient.invalidateQueries({ queryKey: ["asistencias"] })
      if (s.estado === "ASIGNADA") {
        toast.success("¡Proveedor asignado!", {
          description: `${s.proveedor?.nombre} llegará en aprox. ${s.eta_minutos} min.`,
        })
      } else {
        toast.warning("Solicitud registrada", {
          description: "Estamos buscando un proveedor disponible.",
        })
      }
      navigate(`/asistencias/${s.id}`)
    },
  })

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    crear.mutate()
  }

  const err = (campo: string) => errorCampo(crear.error, campo)
  const puedeEnviar =
    servicio && descripcion.trim() && coordsFinales && telefono && !noCubierto && !crear.isPending

  return (
    <>
      <Encabezado
        titulo="Solicitar asistencia"
        descripcion="Cuéntanos qué pasó y dónde estás. Te asignaremos el proveedor más cercano."
        acciones={
          <Button variant="ghost" render={<Link to="/asistencias" />} nativeButton={false}>
            <ArrowLeftIcon data-icon="inline-start" />
            Volver
          </Button>
        }
      />

      {polizas.isSuccess && polizasVigentes.length === 0 && (
        <Alert variant="destructive">
          <AlertTitle>No tienes pólizas vigentes</AlertTitle>
          <AlertDescription>
            Vincula una póliza vigente en <Link to="/polizas">Mis pólizas</Link> para solicitar
            asistencias.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>1. ¿Qué servicio necesitas?</CardTitle>
              <CardDescription>Selecciona el tipo de asistencia.</CardDescription>
            </CardHeader>
            <CardContent>
              {tipos.isPending ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {[0, 1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : (
                <FieldSet>
                  <FieldLegend className="sr-only">Tipo de servicio</FieldLegend>
                  <RadioGroup
                    value={servicio}
                    onValueChange={(v) => setServicio(v as string)}
                    className="sm:grid-cols-2"
                  >
                    {tipos.data?.map((t) => {
                      return (
                        <FieldLabel key={t.codigo} htmlFor={`servicio-${t.codigo}`}>
                          <Field orientation="horizontal">
                            <ServicioIcono codigo={t.codigo} />
                            <FieldContent>
                              <FieldTitle>{t.nombre}</FieldTitle>
                              <FieldDescription>{t.descripcion}</FieldDescription>
                            </FieldContent>
                            <RadioGroupItem value={t.codigo} id={`servicio-${t.codigo}`} />
                          </Field>
                        </FieldLabel>
                      )
                    })}
                  </RadioGroup>
                  <FieldError>{err("tipo_servicio")}</FieldError>
                </FieldSet>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Cuéntanos qué pasó</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={Boolean(err("poliza")) || undefined}>
                  <FieldLabel htmlFor="poliza">Póliza / vehículo</FieldLabel>
                  <Select
                    items={polizaItems}
                    value={polizaId}
                    onValueChange={(v) => setPolizaId(v as string | null)}
                  >
                    <SelectTrigger id="poliza" className="w-full" aria-invalid={Boolean(err("poliza")) || undefined}>
                      <SelectValue placeholder="Selecciona tu póliza" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {polizaItems.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {noCubierto && (
                    <FieldError>Tu póliza no cubre {tipoSeleccionado?.nombre}.</FieldError>
                  )}
                  <FieldError>{err("poliza")}</FieldError>
                </Field>
                <Field data-invalid={Boolean(err("descripcion")) || undefined}>
                  <FieldLabel htmlFor="descripcion">Descripción de la situación</FieldLabel>
                  <Textarea
                    id="descripcion"
                    required
                    rows={4}
                    placeholder="Ej: El carro se apagó y no vuelve a encender, estoy en el carril derecho."
                    value={descripcion}
                    onChange={(e) => setDescripcion(e.target.value)}
                    aria-invalid={Boolean(err("descripcion")) || undefined}
                  />
                  <FieldError>{err("descripcion")}</FieldError>
                </Field>
                {servicio === "GRUA" && (
                  <Field data-invalid={Boolean(err("destino_direccion")) || undefined}>
                    <FieldLabel htmlFor="destino">¿A dónde llevamos el vehículo?</FieldLabel>
                    <Input
                      id="destino"
                      required
                      placeholder="Dirección del taller o destino"
                      value={destino}
                      onChange={(e) => setDestino(e.target.value)}
                      aria-invalid={Boolean(err("destino_direccion")) || undefined}
                    />
                    <FieldError>{err("destino_direccion")}</FieldError>
                  </Field>
                )}
                <Field data-invalid={Boolean(err("telefono_contacto")) || undefined}>
                  <FieldLabel htmlFor="telefono">Teléfono de contacto</FieldLabel>
                  <Input
                    id="telefono"
                    type="tel"
                    required
                    value={telefono}
                    onChange={(e) => setTelefono(e.target.value)}
                  />
                  <FieldError>{err("telefono_contacto")}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>3. ¿Dónde estás?</CardTitle>
              <CardDescription>Usamos tu ubicación para encontrar el proveedor más cercano.</CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                {coords ? (
                  <Alert>
                    <MapPinIcon />
                    <AlertTitle>Ubicación detectada</AlertTitle>
                    <AlertDescription>
                      <span>
                        {coords.latitud.toFixed(5)}, {coords.longitud.toFixed(5)}
                        {coords.precision ? ` (±${Math.round(coords.precision)} m)` : ""}
                      </span>
                      <a
                        href={urlMapa(coords.latitud, coords.longitud)}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-4"
                      >
                        Ver en el mapa
                      </a>
                    </AlertDescription>
                  </Alert>
                ) : (
                  errorUbicacion && (
                    <Alert variant="destructive">
                      <MapPinIcon />
                      <AlertTitle>No pudimos ubicarte</AlertTitle>
                      <AlertDescription>
                        {errorUbicacion} Puedes ingresar las coordenadas manualmente.
                      </AlertDescription>
                    </Alert>
                  )
                )}
                <Button type="button" variant="outline" onClick={ubicar} disabled={ubicando}>
                  {ubicando ? <Spinner data-icon="inline-start" /> : <CrosshairIcon data-icon="inline-start" />}
                  {coords ? "Actualizar ubicación" : "Usar mi ubicación actual"}
                </Button>
                {!coords && (
                  <div className="grid grid-cols-2 gap-3">
                    <Field>
                      <FieldLabel htmlFor="lat">Latitud</FieldLabel>
                      <Input
                        id="lat"
                        inputMode="decimal"
                        placeholder="4.6600"
                        value={manual.latitud}
                        onChange={(e) => setManual((m) => ({ ...m, latitud: e.target.value }))}
                      />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor="lon">Longitud</FieldLabel>
                      <Input
                        id="lon"
                        inputMode="decimal"
                        placeholder="-74.1100"
                        value={manual.longitud}
                        onChange={(e) => setManual((m) => ({ ...m, longitud: e.target.value }))}
                      />
                    </Field>
                  </div>
                )}
                <Field>
                  <FieldLabel htmlFor="direccion">Dirección (opcional)</FieldLabel>
                  <Input
                    id="direccion"
                    placeholder="Av. Calle 26 # 70-10"
                    value={direccion}
                    onChange={(e) => setDireccion(e.target.value)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="referencia">Punto de referencia (opcional)</FieldLabel>
                  <Input
                    id="referencia"
                    placeholder="Frente a la estación de gasolina"
                    value={referencia}
                    onChange={(e) => setReferencia(e.target.value)}
                  />
                </Field>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-col items-stretch gap-3">
              <ErrorAlert error={crear.error} titulo="No se pudo crear la solicitud" />
              <Button type="submit" size="lg" disabled={!puedeEnviar}>
                {crear.isPending ? <Spinner data-icon="inline-start" /> : <SendIcon data-icon="inline-start" />}
                Solicitar asistencia
              </Button>
              {tipoSeleccionado && (
                <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  Servicio: <Badge variant="secondary">{tipoSeleccionado.nombre}</Badge>
                </p>
              )}
            </CardFooter>
          </Card>
        </div>
      </form>
    </>
  )
}
