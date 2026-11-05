import { useState } from "react"
import { Link } from "react-router"
import { BellIcon, CheckCheckIcon, CheckIcon } from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { Encabezado, ErrorAlert } from "@/components/comunes"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item"
import { Skeleton } from "@/components/ui/skeleton"
import {
  useMarcarLeida,
  useMarcarTodasLeidas,
  useNotificaciones,
} from "@/hooks/use-notificaciones"
import { formatFechaHora } from "@/lib/format"

export function NotificacionesPage() {
  const { usuario } = useAuth()
  const [pagina, setPagina] = useState(1)
  const notificaciones = useNotificaciones({ page: pagina })
  const marcarLeida = useMarcarLeida()
  const marcarTodas = useMarcarTodasLeidas()

  const enlace = (solicitud: number) =>
    usuario?.rol === "ASEGURADO"
      ? `/asistencias/${solicitud}`
      : usuario?.rol === "PROVEEDOR"
        ? `/proveedor/${solicitud}`
        : "/gestion"

  return (
    <>
      <Encabezado
        titulo="Notificaciones"
        acciones={
          <Button variant="outline" onClick={() => marcarTodas.mutate()} disabled={marcarTodas.isPending}>
            <CheckCheckIcon data-icon="inline-start" />
            Marcar todas como leídas
          </Button>
        }
      />
      <ErrorAlert error={notificaciones.error} />
      {notificaciones.isPending ? (
        <Skeleton className="h-64 w-full" />
      ) : notificaciones.data?.results.length ? (
        <>
          <ItemGroup>
            {notificaciones.data.results.map((n) => (
              <Item key={n.id} variant={n.leida ? "outline" : "muted"}>
                <ItemContent>
                  <ItemTitle>
                    {n.titulo}
                    {!n.leida && <Badge>Nueva</Badge>}
                  </ItemTitle>
                  <ItemDescription className="whitespace-pre-line">{n.mensaje}</ItemDescription>
                  <span className="text-xs text-muted-foreground">{formatFechaHora(n.fecha)}</span>
                </ItemContent>
                <ItemActions>
                  {n.solicitud && (
                    <Button
                      variant="outline"
                      size="sm"
                      render={<Link to={enlace(n.solicitud)} />}
                      nativeButton={false}
                      onClick={() => !n.leida && marcarLeida.mutate(n.id)}
                    >
                      Ver solicitud
                    </Button>
                  )}
                  {!n.leida && (
                    <Button variant="ghost" size="icon-sm" aria-label="Marcar como leída" onClick={() => marcarLeida.mutate(n.id)}>
                      <CheckIcon />
                    </Button>
                  )}
                </ItemActions>
              </Item>
            ))}
          </ItemGroup>
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" disabled={!notificaciones.data.previous} onClick={() => setPagina((p) => p - 1)}>
              Anterior
            </Button>
            <Button variant="outline" size="sm" disabled={!notificaciones.data.next} onClick={() => setPagina((p) => p + 1)}>
              Siguiente
            </Button>
          </div>
        </>
      ) : (
        <Empty className="border">
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellIcon />
            </EmptyMedia>
            <EmptyTitle>Sin notificaciones</EmptyTitle>
            <EmptyDescription>Aquí verás los cambios de estado de tus servicios.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </>
  )
}
