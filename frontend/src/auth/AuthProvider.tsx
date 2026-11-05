import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"

import { AuthContext, type RegistroData } from "@/auth/auth-context"
import { api, LOGOUT_EVENT, tokens } from "@/lib/api"
import type { AuthResponse, Usuario } from "@/lib/types"

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [cargando, setCargando] = useState(() => Boolean(tokens.access))

  const recargar = useCallback(async () => {
    if (!tokens.access) {
      setUsuario(null)
      return
    }
    try {
      setUsuario(await api<Usuario>("/auth/me/"))
    } catch {
      tokens.clear()
      setUsuario(null)
    }
  }, [])

  // Al abrir la app, si hay token se recupera el usuario
  useEffect(() => {
    if (!tokens.access) return
    api<Usuario>("/auth/me/")
      .then(setUsuario)
      .catch(() => tokens.clear())
      .finally(() => setCargando(false))
  }, [])

  // Si el refresh token vence, el cliente HTTP emite este evento.
  useEffect(() => {
    const onLogout = () => {
      setUsuario(null)
      queryClient.clear()
    }
    window.addEventListener(LOGOUT_EVENT, onLogout)
    return () => window.removeEventListener(LOGOUT_EVENT, onLogout)
  }, [queryClient])

  const iniciarSesion = useCallback((data: AuthResponse) => {
    tokens.set(data.access, data.refresh)
    setUsuario(data.usuario)
    return data.usuario
  }, [])

  const login = useCallback(
    async (email: string, password: string) =>
      iniciarSesion(
        await api<AuthResponse>("/auth/login/", {
          method: "POST",
          body: { email, password },
          auth: false,
        })
      ),
    [iniciarSesion]
  )

  const registro = useCallback(
    async (data: RegistroData) =>
      iniciarSesion(
        await api<AuthResponse>("/auth/registro/", {
          method: "POST",
          body: data,
          auth: false,
        })
      ),
    [iniciarSesion]
  )

  const logout = useCallback(async () => {
    const refresh = tokens.refresh
    if (refresh) {
      await api("/auth/logout/", { method: "POST", body: { refresh } }).catch(() => undefined)
    }
    tokens.clear()
    setUsuario(null)
    queryClient.clear()
  }, [queryClient])

  const value = useMemo(
    () => ({ usuario, cargando, login, registro, logout, recargar }),
    [usuario, cargando, login, registro, logout, recargar]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
