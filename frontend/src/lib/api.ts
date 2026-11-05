/**
 * Cliente HTTP para la API de Django REST Framework.
 * - Lee la URL base de VITE_API_URL (.env)
 * - Envía el JWT en cada petición
 * - Si el access token vence, lo renueva con el refresh token y reintenta
 */

export const API_URL = (
  import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api"
).replace(/\/+$/, "")

export const POLLING_MS = Number(import.meta.env.VITE_POLLING_MS ?? 10000)

/** Teléfono de la línea de asistencia 24/7 (opcional; si no existe no se muestra). */
export const LINEA_ASISTENCIA: string = import.meta.env.VITE_LINEA_ASISTENCIA ?? ""

const ACCESS_KEY = "ike.access"
const REFRESH_KEY = "ike.refresh"
export const LOGOUT_EVENT = "ike:logout"

export const tokens = {
  get access() {
    return localStorage.getItem(ACCESS_KEY)
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY)
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

type ErrorBody = Record<string, unknown> | string | null

function primerMensaje(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return primerMensaje(value[0])
  if (value && typeof value === "object") {
    return primerMensaje(Object.values(value)[0])
  }
  return undefined
}

export class ApiError extends Error {
  status: number
  fieldErrors: Record<string, string>

  constructor(status: number, body: ErrorBody) {
    const fieldErrors: Record<string, string> = {}
    let message = "Ocurrió un error inesperado."

    if (typeof body === "string" && body) {
      message = body
    } else if (body && typeof body === "object") {
      for (const [key, value] of Object.entries(body)) {
        const msg = primerMensaje(value)
        if (msg) fieldErrors[key] = msg
      }
      message =
        fieldErrors.detail ??
        fieldErrors.non_field_errors ??
        Object.values(fieldErrors)[0] ??
        message
    }
    if (status === 0) message = "No se pudo conectar con el servidor."

    super(message)
    this.status = status
    this.fieldErrors = fieldErrors
  }
}

let refreshing: Promise<boolean> | null = null

async function renovarAccess(): Promise<boolean> {
  const refresh = tokens.refresh
  if (!refresh) return false
  refreshing ??= fetch(`${API_URL}/auth/refresh/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh }),
  })
    .then(async (res) => {
      if (!res.ok) return false
      const data = (await res.json()) as { access: string; refresh?: string }
      tokens.set(data.access, data.refresh)
      return true
    })
    .catch(() => false)
    .finally(() => {
      refreshing = null
    })
  return refreshing
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE"
  body?: unknown
  params?: Record<string, string | number | boolean | null | undefined>
  auth?: boolean
}

export async function api<T>(
  path: string,
  { method = "GET", body, params, auth = true }: RequestOptions = {},
  reintento = false
): Promise<T> {
  const url = new URL(`${API_URL}${path.startsWith("/") ? path : `/${path}`}`)
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value))
    }
  }

  const headers: Record<string, string> = { Accept: "application/json" }
  if (body !== undefined) headers["Content-Type"] = "application/json"
  if (auth && tokens.access) headers.Authorization = `Bearer ${tokens.access}`

  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch {
    throw new ApiError(0, null)
  }

  if (res.status === 401 && auth && !reintento) {
    if (await renovarAccess()) {
      return api<T>(path, { method, body, params, auth }, true)
    }
    tokens.clear()
    window.dispatchEvent(new Event(LOGOUT_EVENT))
  }

  if (res.status === 204 || res.status === 205) return undefined as T

  const text = await res.text()
  let data: unknown
  try {
    data = text ? JSON.parse(text) : null
  } catch {
    data = text
  }

  if (!res.ok) throw new ApiError(res.status, data as ErrorBody)
  return data as T
}
