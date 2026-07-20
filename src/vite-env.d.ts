/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL of the Dashboard Data API, up to and including `/api`
   *  e.g. https://get-fingertips-data-....azurewebsites.net/api */
  readonly VITE_DASH_API_BASE_URL: string
  /** Azure Functions key (query-string `code`). Public by design — see the
   *  security note in the API's openapi.yaml. */
  readonly VITE_DASH_API_KEY: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
