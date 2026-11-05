import { useState, type FormEvent } from "react"
import { Link, useNavigate } from "react-router"

import { type RegistroData, useAuth } from "@/auth/auth-context"
import { ErrorAlert, errorCampo } from "@/components/comunes"
import { AuthShell } from "@/components/layout/AuthShell"
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
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSeparator,
} from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import type { TipoDocumento } from "@/lib/types"

const TIPOS_DOCUMENTO: { label: string; value: TipoDocumento }[] = [
  { label: "Cédula de ciudadanía", value: "CC" },
  { label: "Cédula de extranjería", value: "CE" },
  { label: "Pasaporte", value: "PA" },
  { label: "NIT", value: "NIT" },
]

const INICIAL: RegistroData = {
  email: "",
  password: "",
  first_name: "",
  last_name: "",
  tipo_documento: "CC",
  documento: "",
  telefono: "",
  numero_poliza: "",
}

export function RegistroPage() {
  const { registro } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState<RegistroData>(INICIAL)
  const [error, setError] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  const set = (campo: keyof RegistroData) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }))

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      await registro(form)
      navigate("/asistencias", { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  const campo = (
    id: keyof RegistroData,
    label: string,
    props: React.ComponentProps<typeof Input> = {},
    descripcion?: string
  ) => {
    const err = errorCampo(error, id)
    return (
      <Field data-invalid={Boolean(err) || undefined}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Input
          id={id}
          required
          value={form[id]}
          onChange={set(id)}
          aria-invalid={Boolean(err) || undefined}
          {...props}
        />
        {descripcion && !err && <FieldDescription>{descripcion}</FieldDescription>}
        <FieldError>{err}</FieldError>
      </Field>
    )
  }

  return (
    <AuthShell>
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Crear cuenta de asegurado</CardTitle>
          <CardDescription>
            Necesitas tu número de póliza y el documento del titular.
          </CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <FieldGroup>
              <ErrorAlert error={error} titulo="No pudimos crear tu cuenta" />
              <div className="grid gap-4 sm:grid-cols-2">
                {campo("first_name", "Nombres", { autoComplete: "given-name" })}
                {campo("last_name", "Apellidos", { autoComplete: "family-name" })}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="tipo_documento">Tipo de documento</FieldLabel>
                  <Select
                    items={TIPOS_DOCUMENTO}
                    value={form.tipo_documento}
                    onValueChange={(v) =>
                      v && setForm((f) => ({ ...f, tipo_documento: v as TipoDocumento }))
                    }
                  >
                    <SelectTrigger id="tipo_documento" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {TIPOS_DOCUMENTO.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                {campo("documento", "Número de documento", { inputMode: "numeric" })}
              </div>
              {campo("telefono", "Celular", { type: "tel", autoComplete: "tel" })}
              {campo(
                "numero_poliza",
                "Número de póliza",
                { placeholder: "POL-0000" },
                "Lo encuentras en tu carátula de póliza."
              )}
              <FieldSeparator />
              {campo("email", "Email", { type: "email", autoComplete: "email" })}
              {campo(
                "password",
                "Contraseña",
                { type: "password", autoComplete: "new-password", minLength: 8 },
                "Mínimo 8 caracteres, no solo números."
              )}
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Spinner data-icon="inline-start" />}
              Crear cuenta
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link to="/login" className="text-primary underline-offset-4 hover:underline">
                Inicia sesión
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  )
}
