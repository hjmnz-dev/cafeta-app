/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, por ejemplo http://localhost:3000/api/v1 (spec 0004). */
  readonly VITE_API_URL?: string;
  /** DSN del proyecto cafeta-web en Sentry; vacío fuera de producción (spec 0007). */
  readonly VITE_SENTRY_DSN?: string;
  /** Commit desplegado; lo pone el job deploy con github.sha (spec 0007). */
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
