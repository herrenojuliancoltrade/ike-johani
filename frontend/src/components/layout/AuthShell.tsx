import type { ReactNode } from "react"
import { MapPinnedIcon, ShieldCheckIcon, TimerIcon, TruckIcon } from "lucide-react"

import { IconoInstalar, InstalarApp } from "@/components/instalar-app"
import { Logo } from "@/components/marca"
import { Button } from "@/components/ui/button"

const BENEFICIOS = [
  {
    icono: TruckIcon,
    titulo: "Proveedor más cercano, automático",
    texto: "Grúa, carro taller, cerrajería y más, asignados en segundos.",
  },
  {
    icono: MapPinnedIcon,
    titulo: "Seguimiento en tiempo real",
    texto: "Mira cuándo llega el técnico y en qué paso va tu servicio.",
  },
  {
    icono: ShieldCheckIcon,
    titulo: "Respaldado por tu póliza",
    texto: "Solo ves y solicitas los servicios que tu póliza cubre.",
  },
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-svh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      {/* Panel de marca (solo pantallas grandes) */}
      <aside className="bg-marca relative hidden overflow-hidden p-10 text-primary-foreground lg:flex lg:flex-col xl:p-14">
        <div className="bg-trama pointer-events-none absolute inset-0 opacity-30" />
        <div className="pointer-events-none absolute -right-24 -bottom-24 size-96 rounded-full bg-primary-foreground/10 blur-3xl" />
        <Logo className="relative" variante="translucido" />

        <div className="relative mt-auto flex max-w-lg flex-col gap-8">
          <div className="flex flex-col gap-4">
            <span className="flex w-fit items-center gap-2 rounded-full bg-primary-foreground/15 px-3 py-1 text-xs font-medium ring-1 ring-primary-foreground/20">
              <TimerIcon className="size-3.5" />
              Disponible 24/7
            </span>
            <h2 className="text-4xl leading-tight font-semibold xl:text-5xl">
              Asistencia en la vía, en minutos.
            </h2>
            <p className="text-lg text-primary-foreground/80">
              Pide ayuda desde tu celular y sigue al técnico hasta que llegue.
            </p>
          </div>
          <ul className="flex flex-col gap-5">
            {BENEFICIOS.map((b) => (
              <li key={b.titulo} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/15 ring-1 ring-primary-foreground/20">
                  <b.icono className="size-5" />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="font-medium">{b.titulo}</span>
                  <span className="text-sm text-primary-foreground/75">{b.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative mt-12 text-xs text-primary-foreground/60">
          © {new Date().getFullYear()} IKE Asistencias
        </p>
      </aside>

      {/* Formulario */}
      <section className="relative flex flex-col items-center justify-center gap-8 px-4 py-10 sm:px-8">
        <Logo className="lg:hidden" />
        <div className="flex w-full justify-center">{children}</div>
        <InstalarApp>
          {(abrir) => (
            <Button variant="ghost" size="sm" onClick={abrir}>
              <IconoInstalar data-icon="inline-start" />
              Instalar la app en este dispositivo
            </Button>
          )}
        </InstalarApp>
      </section>
    </div>
  )
}
