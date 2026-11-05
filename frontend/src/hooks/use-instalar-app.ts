import { useSyncExternalStore } from "react"

import {
  esIOS,
  esStandalone,
  lanzarInstalacion,
  obtenerPromptInstalacion,
  suscribirInstalacion,
} from "@/lib/pwa"

/**
 * Estado de instalación de la app:
 * - `modo: "prompt"`  → Chrome/Edge permiten instalar con un clic.
 * - `modo: "ios"`     → hay que mostrar las instrucciones de Safari.
 * - `modo: null`      → ya está instalada o el navegador no lo permite.
 */
export function useInstalarApp() {
  const prompt = useSyncExternalStore(suscribirInstalacion, obtenerPromptInstalacion, () => null)
  const instalada = esStandalone()

  const modo: "prompt" | "ios" | null = instalada ? null : prompt ? "prompt" : esIOS() ? "ios" : null

  return { modo, instalada, instalar: lanzarInstalacion }
}
