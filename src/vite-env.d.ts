/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_EIA_API_KEY: string
  readonly VITE_NREL_API_KEY: string
  readonly VITE_FRED_API_KEY: string
  readonly VITE_ANTHROPIC_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
