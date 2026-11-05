import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { api } from "@/lib/api"
import type { Notificacion, Paginated } from "@/lib/types"

const INTERVALO = 15000

export function useNotificaciones(params: { leida?: boolean; page?: number } = {}) {
  return useQuery({
    queryKey: ["notificaciones", params],
    queryFn: () => api<Paginated<Notificacion>>("/notificaciones/", { params }),
    refetchInterval: INTERVALO,
  })
}

export function useNoLeidas() {
  return useQuery({
    queryKey: ["notificaciones", "no-leidas"],
    queryFn: () => api<{ total: number }>("/notificaciones/no-leidas/"),
    refetchInterval: INTERVALO,
  })
}

export function useMarcarLeida() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api(`/notificaciones/${id}/marcar-leida/`, { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }),
  })
}

export function useMarcarTodasLeidas() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api("/notificaciones/marcar-todas-leidas/", { method: "POST" }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notificaciones"] }),
  })
}
