import { useQuery } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Paginated, Poliza, TipoServicio } from "@/lib/types"

export function useTiposServicio() {
  return useQuery({
    queryKey: ["tipos-servicio"],
    queryFn: () => api<TipoServicio[]>("/tipos-servicio/", { auth: false }),
    staleTime: 5 * 60 * 1000,
  })
}

export function usePolizas(params: Record<string, string | number | undefined> = {}) {
  return useQuery({
    queryKey: ["polizas", params],
    queryFn: () => api<Paginated<Poliza>>("/polizas/", { params }),
  })
}

/** Obtiene la posición GPS del navegador como promesa. */
export function obtenerUbicacion(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Tu navegador no permite obtener la ubicación."))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, (err) => {
      const mensajes: Record<number, string> = {
        1: "Debes permitir el acceso a tu ubicación.",
        2: "No se pudo determinar tu ubicación.",
        3: "Se agotó el tiempo para obtener la ubicación.",
      }
      reject(new Error(mensajes[err.code] ?? err.message))
    }, { enableHighAccuracy: true, timeout: 15000 })
  })
}
