import { cn } from "@/lib/utils"

/**
 * Isotipo: escudo con check.
 * - `solido`: sobre el degradado de marca (uso general).
 * - `translucido`: para fondos que ya tienen el color de marca.
 */
export function LogoMarca({
  className,
  variante = "solido",
}: {
  className?: string
  variante?: "solido" | "translucido"
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-[28%] text-primary-foreground",
        variante === "solido"
          ? "bg-marca shadow-sm shadow-primary/30"
          : "bg-primary-foreground/15 ring-1 ring-primary-foreground/25",
        className
      )}
    >
      <svg viewBox="0 0 512 512" aria-hidden className="size-[68%]">
        <path
          d="M256 100 380 148v96c0 82-53 143-124 170-71-27-124-88-124-170v-96Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="38"
          strokeLinejoin="round"
        />
        <path
          d="m198 258 40 40 78-78"
          fill="none"
          stroke="currentColor"
          strokeWidth="38"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  )
}

/** Logo completo: isotipo + nombre. */
export function Logo({
  className,
  marcaClassName,
  variante,
  subtitulo = "Asistencias",
}: {
  className?: string
  marcaClassName?: string
  variante?: "solido" | "translucido"
  subtitulo?: string
}) {
  return (
    <span className={cn("flex items-center gap-2.5", className)}>
      <LogoMarca className={marcaClassName} variante={variante} />
      <span className="flex flex-col leading-none">
        <span className="text-base font-bold tracking-tight">IKE</span>
        <span className="text-xs font-medium opacity-70">{subtitulo}</span>
      </span>
    </span>
  )
}
