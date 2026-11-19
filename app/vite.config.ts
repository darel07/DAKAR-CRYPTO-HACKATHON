import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  build: { target: "es2022" },
  // Backend de la branche back (port 8080 par défaut). S'il est éteint, le front se replie seul.
  server: { proxy: { "/api": "http://localhost:8080" } },
});
