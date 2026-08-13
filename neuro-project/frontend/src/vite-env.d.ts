/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SERIAL_PORT?: string;
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
