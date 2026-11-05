import { createContext, useContext } from "react"

import type { TipoDocumento, Usuario } from "@/lib/types"

export interface RegistroData {
  email: string
  password: string
  first_name: string
  last_name: string
  tipo_documento: TipoDocumento
  documento: string
  telefono: string
  numero_poliza: string
}

export interface AuthState {
  usuario: Usuario | null
  cargando: boolean
  login: (email: string, password: string) => Promise<Usuario>
  registro: (data: RegistroData) => Promise<Usuario>
  logout: () => Promise<void>
  recargar: () => Promise<void>
}

export const AuthContext = createContext<AuthState | undefined>(undefined)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>")
  return ctx
}

export function rutaInicio(usuario: Usuario | null) {
  if (!usuario) return "/login"
  if (usuario.rol === "ASEGURADO") return "/asistencias"
  if (usuario.rol === "PROVEEDOR") return "/proveedor"
  return "/gestion"
}
