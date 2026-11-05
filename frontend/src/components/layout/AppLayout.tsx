import { Link, Outlet, useLocation } from "react-router"
import { HeadsetIcon } from "lucide-react"

import { useAuth } from "@/auth/auth-context"
import { IconoInstalar, InstalarApp } from "@/components/instalar-app"
import { MenuNotificaciones } from "@/components/layout/MenuNotificaciones"
import { MenuUsuario } from "@/components/layout/MenuUsuario"
import { itemActivo, NAV, type NavItem } from "@/components/layout/navegacion"
import { Logo, LogoMarca } from "@/components/marca"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { useNoLeidas } from "@/hooks/use-notificaciones"
import { LINEA_ASISTENCIA } from "@/lib/api"
import { ROLES } from "@/lib/format"
import { cn } from "@/lib/utils"

export function AppLayout() {
  const { usuario } = useAuth()
  const { pathname } = useLocation()
  const items = usuario ? NAV[usuario.rol] : []
  const activo = itemActivo(items, pathname)
  const { data: noLeidas } = useNoLeidas()
  const sinLeer = noLeidas?.total ?? 0

  return (
    <SidebarProvider>
      <AppSidebar items={items} activo={activo} sinLeer={sinLeer} />
      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-4 backdrop-blur-md md:rounded-t-xl md:px-6">
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Link to="/" className="md:hidden">
            <Logo marcaClassName="size-8" />
          </Link>
          <span className="hidden text-sm text-muted-foreground md:inline">
            {usuario ? (usuario.proveedor_nombre ?? ROLES[usuario.rol]) : ""}
          </span>
          <div className="ml-auto flex items-center gap-1">
            <div className="hidden md:block">
              <MenuNotificaciones />
            </div>
            <MenuUsuario />
          </div>
        </header>
        <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pt-6 pb-28 md:px-8 md:pb-10">
          <Outlet />
        </main>
        <NavInferior items={items} activo={activo} sinLeer={sinLeer} />
      </SidebarInset>
    </SidebarProvider>
  )
}

function AppSidebar({ items, activo, sinLeer }: { items: NavItem[]; activo?: string; sinLeer: number }) {
  const { usuario } = useAuth()

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/" />} tooltip="IKE Asistencias">
              <LogoMarca className="size-8" />
              <span className="flex flex-col leading-tight">
                <span className="font-bold tracking-tight">IKE</span>
                <span className="text-xs text-sidebar-foreground/70">Asistencias</span>
              </span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{usuario ? ROLES[usuario.rol] : "Menú"}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    render={<Link to={item.to} />}
                    isActive={activo === item.to}
                    tooltip={item.label}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                  {item.contador && sinLeer > 0 && (
                    <SidebarMenuBadge>{sinLeer > 99 ? "99+" : sinLeer}</SidebarMenuBadge>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          <InstalarApp>
            {(abrir) => (
              <SidebarMenuItem>
                <SidebarMenuButton onClick={abrir} tooltip="Instalar app">
                  <IconoInstalar />
                  <span>Instalar app</span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </InstalarApp>
          {LINEA_ASISTENCIA && (
            <SidebarMenuItem>
              <SidebarMenuButton
                size="lg"
                tooltip="Línea de asistencia 24/7"
                render={<a href={`tel:${LINEA_ASISTENCIA.replace(/\s+/g, "")}`} />}
              >
                <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-accent text-sidebar-accent-foreground">
                  <HeadsetIcon className="size-4" />
                </span>
                <span className="flex flex-col leading-tight">
                  <span className="text-xs text-sidebar-foreground/70">Línea 24/7</span>
                  <span className="font-medium">{LINEA_ASISTENCIA}</span>
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}

/** Barra de navegación inferior tipo app (solo celular). */
function NavInferior({ items, activo, sinLeer }: { items: NavItem[]; activo?: string; sinLeer: number }) {
  if (items.length < 2) return null
  return (
    <nav
      aria-label="Navegación principal"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur-md md:hidden"
    >
      <ul className="mx-auto flex max-w-md items-stretch justify-around px-2">
        {items.map((item) => {
          const esActivo = activo === item.to
          return (
            <li key={item.to} className="flex flex-1">
              <Link
                to={item.to}
                aria-current={esActivo ? "page" : undefined}
                className={cn(
                  "relative flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium text-muted-foreground transition-colors",
                  esActivo && "text-primary"
                )}
              >
                {item.destacado ? (
                  <span className="bg-marca -mt-5 flex size-12 items-center justify-center rounded-2xl text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background">
                    <item.icon className="size-6" />
                  </span>
                ) : (
                  <span
                    className={cn(
                      "relative flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                      esActivo && "bg-primary/10"
                    )}
                  >
                    <item.icon className="size-5" />
                    {item.contador && sinLeer > 0 && (
                      <Badge className="absolute -top-1 right-0.5 h-4 min-w-4 px-1 text-[10px]">
                        {sinLeer > 9 ? "9+" : sinLeer}
                      </Badge>
                    )}
                  </span>
                )}
                {item.corto ?? item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
