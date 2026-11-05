/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_POLLING_MS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
