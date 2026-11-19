/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base des appels au backend (défaut : « /api », même origine). */
  readonly VITE_API_BASE?: string;
}
