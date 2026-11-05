import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"
import { ArrowRightIcon, EyeIcon, EyeOffIcon, LockIcon, MailIcon } from "lucide-react"

import { rutaInicio, useAuth } from "@/auth/auth-context"
import { AuthShell } from "@/components/layout/AuthShell"
import { ErrorAlert } from "@/components/comunes"
import { Button } from "@/components/ui/button"
import { Field, FieldGroup, FieldLabel, FieldSeparator } from "@/components/ui/field"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group"
import { Spinner } from "@/components/ui/spinner"

const CUENTAS_DEMO = [
  { rol: "Asegurado", email: "asegurado@demo.com" },
  { rol: "Proveedor", email: "proveedor@gruaseldorado.com" },
  { rol: "Técnico", email: "tecnico@gruaseldorado.com" },
  { rol: "Operador", email: "operador@ike.com" },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [enviando, setEnviando] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setEnviando(true)
    try {
      const usuario = await login(email, password)
      const desde = (location.state as { from?: string } | null)?.from
      navigate(desde ?? rutaInicio(usuario), { replace: true })
    } catch (err) {
      setError(err)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <AuthShell>
      <div className="flex w-full max-w-sm flex-col gap-8">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold">Hola de nuevo 👋</h1>
          <p className="text-muted-foreground">
            Ingresa para solicitar o gestionar tus asistencias.
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <FieldGroup>
            <ErrorAlert error={error} titulo="No pudimos iniciar sesión" />
            <Field>
              <FieldLabel htmlFor="email">Correo electrónico</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <MailIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="tu@correo.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </InputGroup>
            </Field>
            <Field>
              <FieldLabel htmlFor="password">Contraseña</FieldLabel>
              <InputGroup>
                <InputGroupAddon>
                  <LockIcon />
                </InputGroupAddon>
                <InputGroupInput
                  id="password"
                  type={verClave ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <InputGroupAddon align="inline-end">
                  <InputGroupButton
                    size="icon-xs"
                    aria-label={verClave ? "Ocultar contraseña" : "Mostrar contraseña"}
                    onClick={() => setVerClave((v) => !v)}
                  >
                    {verClave ? <EyeOffIcon /> : <EyeIcon />}
                  </InputGroupButton>
                </InputGroupAddon>
              </InputGroup>
            </Field>
            <Button type="submit" size="lg" className="w-full" disabled={enviando}>
              {enviando && <Spinner data-icon="inline-start" />}
              Entrar
              {!enviando && <ArrowRightIcon data-icon="inline-end" />}
            </Button>
          </FieldGroup>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          ¿Eres asegurado y no tienes cuenta?{" "}
          <Link to="/registro" className="font-medium text-primary underline-offset-4 hover:underline">
            Crea tu cuenta
          </Link>
        </p>

        {import.meta.env.DEV && (
          <div className="flex flex-col gap-3">
            <FieldSeparator>Cuentas demo · clave Demo12345*</FieldSeparator>
            <div className="grid grid-cols-2 gap-2">
              {CUENTAS_DEMO.map((c) => (
                <Button
                  key={c.email}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEmail(c.email)
                    setPassword("Demo12345*")
                  }}
                >
                  {c.rol}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </AuthShell>
  )
}
