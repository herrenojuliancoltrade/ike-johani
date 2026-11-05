import type { ReactNode } from "react"
import { Navigate, useLocation } from "react-router"

import { rutaInicio, useAuth } from "@/auth/auth-context"
import { Spinner } from "@/components/ui/spinner"
import type { Rol } from "@/lib/types"

export function PantallaCarga() {
  return (
    <div className="flex min-h-svh items-center justify-center">
      <Spinner />
    </div>
  )
}

export function RequireAuth({ roles, children }: { roles?: Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useAuth()
  const location = useLocation()

  if (cargando) return <PantallaCarga />
  if (!usuario) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  if (roles && !roles.includes(usuario.rol)) return <Navigate to={rutaInicio(usuario)} replace />
  return children
}

export function SoloInvitados({ children }: { children: ReactNode }) {
  const { usuario, cargando } = useAuth()
  if (cargando) return <PantallaCarga />
  if (usuario) return <Navigate to={rutaInicio(usuario)} replace />
  return children
}

export function RedirigirInicio() {
  const { usuario, cargando } = useAuth()
  if (cargando) return <PantallaCarga />
  return <Navigate to={rutaInicio(usuario)} replace />
}
