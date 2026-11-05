import { useSyncExternalStore, type ReactNode } from "react"
import { MonitorSmartphoneIcon, PlusSquareIcon, ShareIcon } from "lucide-react"
import { toast } from "sonner"

import { LogoMarca } from "@/components/marca"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useInstalarApp } from "@/hooks/use-instalar-app"

export const IconoInstalar = MonitorSmartphoneIcon

// Estado global del diálogo de ayuda de iOS: el disparador puede vivir dentro
// de un menú que se cierra (y se desmonta) al hacer clic.
let ayudaAbierta = false
const oyentes = new Set<() => void>()
function setAyuda(valor: boolean) {
  ayudaAbierta = valor
  oyentes.forEach((fn) => fn())
}
function suscribir(fn: () => void) {
  oyentes.add(fn)
  return () => {
    oyentes.delete(fn)
  }
}

/**
 * Muestra el disparador de "Instalar app" solo si el navegador lo permite.
 * - Chrome/Edge: abre el diálogo nativo de instalación.
 * - iOS Safari: abre las instrucciones para agregarla a la pantalla de inicio.
 */
export function InstalarApp({ children }: { children: (abrir: () => void) => ReactNode }) {
  const { modo, instalar } = useInstalarApp()
  if (!modo) return null

  const abrir = async () => {
    if (modo === "ios") {
      setAyuda(true)
      return
    }
    if (await instalar()) toast.success("¡Listo! IKE quedó instalada en tu dispositivo.")
  }

  return children(() => void abrir())
}

/** Diálogo con los pasos de instalación en iPhone/iPad. Se monta una sola vez. */
export function AyudaInstalacionIOS() {
  const abierto = useSyncExternalStore(suscribir, () => ayudaAbierta)
  return (
    <Dialog open={abierto} onOpenChange={setAyuda}>
      <DialogContent>
        <DialogHeader>
          <LogoMarca className="size-12" />
          <DialogTitle>Instala IKE en tu iPhone</DialogTitle>
          <DialogDescription>Tenla a un toque, como cualquier otra app.</DialogDescription>
        </DialogHeader>
        <ol className="flex flex-col gap-3 text-sm">
          <PasoIOS n={1}>
            Toca <ShareIcon className="inline size-4 align-text-bottom" /> <b>Compartir</b> en la
            barra de Safari.
          </PasoIOS>
          <PasoIOS n={2}>
            Elige <PlusSquareIcon className="inline size-4 align-text-bottom" />{" "}
            <b>Agregar a inicio</b>.
          </PasoIOS>
          <PasoIOS n={3}>
            Toca <b>Agregar</b> y abre IKE desde tu pantalla de inicio.
          </PasoIOS>
        </ol>
      </DialogContent>
    </Dialog>
  )
}

function PasoIOS({ n, children }: { n: number; children: ReactNode }) {
  return (
    <li className="flex items-start gap-3">
      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
        {n}
      </span>
      <span className="pt-0.5">{children}</span>
    </li>
  )
}
