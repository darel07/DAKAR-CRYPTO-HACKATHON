/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  /** Base des appels au backend (défaut : « /api », même origine). */
  readonly VITE_API_BASE?: string;
}

/** Version de package.json, injectée par vite.config.ts. */
declare const __VERSION_APP__: string;
