import { expect, test } from "@playwright/test";
import { activerDemo, declarerVente, sansDebordement, saisirMontant } from "./outils";

test("1. encaisser en démo : QR, paiement reçu, vente « Démo » (jamais « Prouvé ») dans l'historique", async ({ page }) => {
  await activerDemo(page);
  await page.goto("/#/");
  await saisirMontant(page, "12500");
  await expect(page.getByText("12 500").first()).toBeVisible();
  await sansDebordement(page);
  await page.getByRole("button", { name: "Créer un QR code" }).click();
  await expect(page.getByRole("img", { name: /QR code de paiement/ })).toBeVisible();
  await sansDebordement(page);
  await expect(page.getByRole("heading", { name: "Paiement reçu !" })).toBeVisible({ timeout: 20_000 });
  await sansDebordement(page);
  await page.goto("/#/ventes");
  // Pastilles des ventes (pas la carte du total « Prouvé », qui reste à 0 FCFA).
  await expect(page.locator(".pastille", { hasText: "Démo" }).first()).toBeVisible();
  await expect(page.locator(".pastille", { hasText: "Prouvé" })).toHaveCount(0);
});

test("2. vente en espèces ou Wave : analysée, confirmée, marquée « Déclaré »", async ({ page }) => {
  await activerDemo(page);
  await declarerVente(page, "2 sacs de riz, 15 000 wave", "15 000");
  await page.goto("/#/ventes");
  await expect(page.getByText("Déclaré").first()).toBeVisible();
  await sansDebordement(page);
});

test("3. passeport : générer, ouvrir le lien court, signature valide et totaux identiques", async ({ page, context, browserName }) => {
  test.skip(browserName !== "chromium");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await activerDemo(page);
  await declarerVente(page, "huile 6500", "6 500");
  await page.goto("/#/passeport");
  await sansDebordement(page);
  await page.getByRole("button", { name: "Générer mon passeport" }).click();
  await expect(page.getByRole("heading", { name: "Passeport signé" })).toBeVisible();
  await page.getByRole("button", { name: "Copier le lien" }).click();
  const lien = await page.evaluate(() => navigator.clipboard.readText());
  expect(lien).toMatch(/#\/preteur\/p\/[0-9A-Za-z]{10}$/);
  await page.goto(lien);
  await expect(page.getByText("Signature valide")).toBeVisible();
  await expect(page.getByText("6 500").first()).toBeVisible();
  await sansDebordement(page);
});

test("4. passeport modifié ou lien abîmé : refusé", async ({ page, request }) => {
  const { charge } = (await (await request.get("/api/passeports/demo000000")).json()) as { charge: string };
  const milieu = Math.floor(charge.length / 2);
  const abimee = charge.slice(0, milieu) + (charge[milieu] === "A" ? "B" : "A") + charge.slice(milieu + 1);
  await page.goto(`/#/preteur/${abimee}`);
  await expect(page.getByText(/Signature invalide|Passeport illisible/)).toBeVisible();
  await page.goto("/#/preteur/p/inconnu000");
  await expect(page.getByText("Passeport introuvable")).toBeVisible();
});

test("5. navigation : chaque onglet s'ouvre et est marqué comme page courante", async ({ page }) => {
  await activerDemo(page);
  await page.goto("/#/");
  const nav = page.getByRole("navigation", { name: "Navigation principale" });
  for (const [onglet, titre] of [["Ventes", "Historique des ventes"], ["Passeport", "Mon passeport"], ["Réglages", "Réglages"], ["Accueil", "Bonjour"]] as const) {
    await nav.getByRole("link", { name: onglet }).click();
    await expect(page.getByRole("heading", { name: titre }).first()).toBeVisible();
    await expect(nav.getByRole("link", { name: onglet })).toHaveAttribute("aria-current", "page");
    await sansDebordement(page);
  }
});

test("6. hors connexion : l'application démarre, l'historique s'affiche", async ({ page, context }) => {
  await activerDemo(page);
  await declarerVente(page, "savon 2 mille", "2 000");
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText("Bonjour").first()).toBeVisible();
  await page.goto("/#/ventes");
  await expect(page.getByText("Déclaré").first()).toBeVisible();
  await context.setOffline(false);
});
