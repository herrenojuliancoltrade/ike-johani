/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_POLLING_MS?: string
  readonly VITE_LINEA_ASISTENCIA?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
