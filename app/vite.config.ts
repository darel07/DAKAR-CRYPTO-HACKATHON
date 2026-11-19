import { readFileSync } from "node:fs";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const { version } = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8")) as { version: string };

export default defineConfig({
  plugins: [react()],
  // Version affichée dans Réglages > À propos.
  define: { __VERSION_APP__: JSON.stringify(version) },
  build: { target: "es2022" },
  // Backend de la branche back (port 8080 par défaut). S'il est éteint, le front se replie seul.
  server: { proxy: { "/api": "http://localhost:8080" } },
});
