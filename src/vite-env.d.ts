/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** URL base de la API, por ejemplo http://localhost:3000/api/v1 (spec 0004). */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
