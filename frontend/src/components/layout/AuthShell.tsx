import type { ReactNode } from "react"
import { LifeBuoyIcon } from "lucide-react"

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-6 bg-muted/40 p-4">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <LifeBuoyIcon />
        IKE Asistencias
      </div>
      {children}
    </div>
  )
}
