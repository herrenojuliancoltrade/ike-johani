import { useState, type FormEvent } from "react"
import { Link, useLocation, useNavigate } from "react-router"

import { rutaInicio, useAuth } from "@/auth/auth-context"
import { AuthShell } from "@/components/layout/AuthShell"
import { ErrorAlert } from "@/components/comunes"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
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
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Iniciar sesión</CardTitle>
          <CardDescription>Ingresa para solicitar o gestionar asistencias.</CardDescription>
        </CardHeader>
        <form onSubmit={onSubmit}>
          <CardContent>
            <FieldGroup>
              <ErrorAlert error={error} titulo="No pudimos iniciar sesión" />
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                {import.meta.env.DEV && (
                  <FieldDescription>
                    Demo: asegurado@demo.com, proveedor@gruaseldorado.com, tecnico@gruaseldorado.com,
                    operador@ike.com — clave Demo12345*
                  </FieldDescription>
                )}
              </Field>
            </FieldGroup>
          </CardContent>
          <CardFooter className="mt-6 flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={enviando}>
              {enviando && <Spinner data-icon="inline-start" />}
              Entrar
            </Button>
            <p className="text-sm text-muted-foreground">
              ¿Eres asegurado y no tienes cuenta?{" "}
              <Link to="/registro" className="text-primary underline-offset-4 hover:underline">
                Regístrate
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </AuthShell>
  )
}
