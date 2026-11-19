import { defineConfig, devices } from "@playwright/test";

/** Parcours réels contre la stack complète (docker compose up : API + front sur la même origine).
 *  Un seul worker : l'API garde son vrai limiteur de débit, on ne le désactive pas pour les tests. */
export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "**/*.e2e.ts",
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  timeout: 60_000,
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_URL ?? "http://localhost:8080",
    // Chrome installé sur la machine (présent sur les runners GitHub) : rien à télécharger.
    channel: "chrome",
    locale: "fr-FR",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    // Vidéo seulement en local : en CI elle exige le ffmpeg de Playwright ; traces et captures suffisent.
    video: process.env.CI ? "off" : "retain-on-failure",
  },
  projects: [
    { name: "mobile-chromium", use: { ...devices["Pixel 7"], channel: "chrome" } },
    { name: "chromium", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
  ],
});
