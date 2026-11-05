import { useNavigate } from "react-router"
import { BellIcon, CheckCheckIcon } from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNoLeidas,
  useNotificaciones,
} from "@/hooks/use-notificaciones"
import { tiempoRelativo } from "@/lib/format"
import type { Notificacion } from "@/lib/types"

export function MenuNotificaciones() {
  const { usuario } = useAuth()
  const navigate = useNavigate()
  const { data: noLeidas } = useNoLeidas()
  const { data } = useNotificaciones()
  const marcarLeida = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()
  const total = noLeidas?.total ?? 0
  const recientes = data?.results.slice(0, 6) ?? []

  const abrir = (n: Notificacion) => {
    if (!n.leida) marcarLeida.mutate(n.id)
    if (!n.solicitud) return
    if (usuario?.rol === "ASEGURADO") navigate(`/asistencias/${n.solicitud}`)
    else if (usuario?.rol === "PROVEEDOR") navigate(`/proveedor/${n.solicitud}`)
    else navigate("/gestion")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" aria-label="Notificaciones" />}
        className="relative"
      >
        <BellIcon />
        {total > 0 && (
          <Badge className="absolute -top-1 -right-1 h-4 min-w-4 px-1 text-[10px]">
            {total > 9 ? "9+" : total}
          </Badge>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
          {recientes.length === 0 && (
            <DropdownMenuItem disabled>No tienes notificaciones</DropdownMenuItem>
          )}
          {recientes.map((n) => (
            <DropdownMenuItem key={n.id} onClick={() => abrir(n)} className="items-start">
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="truncate font-medium">{n.titulo}</span>
                  {!n.leida && <Badge className="h-4 px-1 text-[10px]">Nueva</Badge>}
                </div>
                <span className="line-clamp-2 text-xs whitespace-pre-line text-muted-foreground">
                  {n.mensaje}
                </span>
                <span className="text-xs text-muted-foreground">{tiempoRelativo(n.fecha)}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem disabled={total === 0} onClick={() => marcarTodas.mutate()}>
            <CheckCheckIcon />
            Marcar todas como leídas
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => navigate("/notificaciones")}>
            <BellIcon />
            Ver todas
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
