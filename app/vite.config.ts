import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

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
  ],
  // Version affichée dans Réglages > À propos.
  define: { __VERSION_APP__: JSON.stringify(version) },
  build: { target: "es2022" },
  // Backend de la branche back (port 8080 par défaut). S'il est éteint, le front se replie seul.
  server: { proxy: { "/api": "http://localhost:8080" } },
});
