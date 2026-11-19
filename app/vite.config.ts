import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { brotliCompressSync, constants, gzipSync } from "node:zlib";
import type { Plugin } from "vite";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

/** Pré-compresse le build (Brotli et gzip) : le serveur sert ces fichiers tels quels
 *  (@fastify/static preCompressed). Sans ça, 466 ko de JS partaient en clair : 4,6 s de
 *  premier affichage en 4G lente (Lighthouse). Compresser à chaque requête coûterait du CPU. */
function preCompression(): Plugin {
  const TEXTE = /\.(js|css|html|svg|webmanifest|json)$/;
  const parcourir = (dossier: string): string[] =>
    readdirSync(dossier).flatMap((f) => {
      const chemin = join(dossier, f);
      return statSync(chemin).isDirectory() ? parcourir(chemin) : [chemin];
    });
  return {
    name: "pre-compression",
    apply: "build",
    closeBundle: {
      order: "post",
      handler() {
        for (const f of parcourir("dist").filter((x) => TEXTE.test(x))) {
          const brut = readFileSync(f);
          if (brut.length < 1024) continue;
          writeFileSync(`${f}.br`, brotliCompressSync(brut, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }));
          writeFileSync(`${f}.gz`, gzipSync(brut, { level: 9 }));
        }
      },
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    // PWA (§9) : la coque est précachée pour démarrer hors connexion. Rien de ce qui porte une
    // facture, un reçu ou un passeport n'est mis en cache : seul le cours l'est (NetworkFirst).
    VitePWA({
      registerType: "prompt",
      injectRegister: null, // enregistré à la main, après le chargement (lib/pwa.ts)
      includeAssets: ["icone.svg", "apple-touch-icon.png"],
      manifest: {
        name: "Caisse Lightning",
        short_name: "Caisse",
        description: "Encaissez en FCFA, recevez en bitcoin Lightning et prouvez vos revenus pour obtenir un crédit.",
        lang: "fr",
        start_url: "/",
        scope: "/",
        display: "standalone",
        orientation: "portrait",
        background_color: "#F5F7F9",
        theme_color: "#18324A",
        icons: [
          { src: "/icone-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "/icone-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          { src: "/icone-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
          { src: "/icone.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
        navigateFallback: "/index.html",
        // Les liens du passeport, du reçu et l'API ne doivent jamais recevoir la coque en cache.
        navigateFallbackDenylist: [/^\/api\//],
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname === "/api/taux" || url.pathname === "/api/taux/historique",
            handler: "NetworkFirst",
            options: { cacheName: "cours", networkTimeoutSeconds: 4, expiration: { maxEntries: 4, maxAgeSeconds: 7 * 86_400 } },
          },
        ],
      },
    }),
    preCompression(),
  ],
  // Version affichée dans Réglages > À propos.
  define: { __VERSION_APP__: JSON.stringify(version) },
  build: { target: "es2022" },
  // Backend de la branche back (port 8080 par défaut). S'il est éteint, le front se replie seul.
  server: { proxy: { "/api": "http://localhost:8080" } },
});
