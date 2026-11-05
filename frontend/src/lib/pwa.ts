/**
 * Soporte PWA: registro del service worker y captura del evento de instalación.
 *
 * Chrome/Edge (PC y Android) disparan `beforeinstallprompt` muy temprano, a
 * veces antes de que React monte; por eso se escucha a nivel de módulo y se
 * guarda para mostrar nuestro propio botón "Instalar app".
 * iOS Safari no tiene ese evento: allí se instala desde Compartir → "Agregar
 * a inicio", y mostramos las instrucciones.
 */

export interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>
}

let promptDiferido: BeforeInstallPromptEvent | null = null
const suscriptores = new Set<() => void>()
const notificar = () => suscriptores.forEach((fn) => fn())

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault()
    promptDiferido = e as BeforeInstallPromptEvent
    notificar()
  })
  window.addEventListener("appinstalled", () => {
    promptDiferido = null
    notificar()
  })
}

export function suscribirInstalacion(fn: () => void) {
  suscriptores.add(fn)
  return () => {
    suscriptores.delete(fn)
  }
}

export function obtenerPromptInstalacion() {
  return promptDiferido
}

export async function lanzarInstalacion() {
  const evento = promptDiferido
  if (!evento) return false
  await evento.prompt()
  const { outcome } = await evento.userChoice
  promptDiferido = null
  notificar()
  return outcome === "accepted"
}

export function esStandalone() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
}

export function esIOS() {
  const ua = navigator.userAgent
  // iPadOS se identifica como Mac, pero tiene pantalla táctil
  return /iphone|ipad|ipod/i.test(ua) || (/macintosh/i.test(ua) && navigator.maxTouchPoints > 1)
}

export function registrarServiceWorker() {
  if (!import.meta.env.PROD || !("serviceWorker" in navigator)) return
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((err) => {
      console.warn("No se pudo registrar el service worker", err)
    })
  })
}
