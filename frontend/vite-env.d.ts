/// <reference types="vite/client" />

// Ambient typings for Vite env vars used in this project
interface ImportMetaEnv {
  readonly VITE_DEFAULT_LANGUAGE?: string;
  readonly VITE_DEFAULT_CURRENCY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
