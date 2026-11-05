/*
 * Service worker de IKE Asistencias (PWA).
 * - Navegación: red primero; si no hay conexión, sirve el index.html guardado.
 * - /assets/* e íconos: caché primero (los nombres llevan hash, nunca cambian).
 * - La API (otro dominio) nunca se cachea: los datos siempre vienen en vivo.
 */
const VERSION = "v1"
const SHELL = `ike-shell-${VERSION}`
const ASSETS = `ike-assets-${VERSION}`
const PRECACHE = ["/", "/manifest.webmanifest", "/logo.svg", "/pwa-192x192.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL).then((c) => c.addAll(PRECACHE)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) {
            const copia = res.clone()
            caches.open(SHELL).then((c) => c.put("/", copia))
          }
          return res
        })
        .catch(() => caches.match("/"))
    )
    return
  }

  if (url.pathname.startsWith("/assets/") || /\.(png|svg|ico|webmanifest|woff2?)$/.test(url.pathname)) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copia = res.clone()
              caches.open(ASSETS).then((c) => c.put(req, copia))
            }
            return res
          })
      )
    )
  }
})
