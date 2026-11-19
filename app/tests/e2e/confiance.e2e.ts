import { expect, test } from "@playwright/test";
import { activerDemo, auditAccessibilite, declarerVente, sansDebordement, saisirMontant } from "./outils";

test("reçu client : le commerçant l'envoie, le client le confirme depuis un autre téléphone", async ({ page, browser, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await activerDemo(page);
  await page.goto("/#/");
  await saisirMontant(page, "2500");
  await page.getByRole("button", { name: "Créer un QR code" }).click();
  await expect(page.getByRole("heading", { name: "Paiement reçu !" })).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Envoyer un reçu au client" }).click();
  await expect(page.getByRole("img", { name: /QR code du reçu/ })).toBeVisible();
  await page.getByRole("button", { name: /Copier le lien|Partager le lien/ }).click();
  const lien = await page.evaluate(() => navigator.clipboard.readText());
  expect(lien).toMatch(/#\/recu-client\/r\/[0-9A-Za-z]{10}$/);

  const client = await (await browser.newContext()).newPage();
  await client.goto(lien);
  await expect(client.getByText("Paiement de démonstration (simulé)")).toBeVisible();
  await sansDebordement(client);
  await client.getByRole("button", { name: "Confirmer cet achat" }).click();
  await expect(client.getByText("Votre confirmation a été enregistrée.")).toBeVisible();
  await client.reload();
  await expect(client.getByText("Cet achat a déjà été confirmé.")).toBeVisible();
});

test("sauvegarde de la clé : 12 mots, case obligatoire, mêmes mots au retour", async ({ page }) => {
  await activerDemo(page);
  await page.goto("/#/cle");
  const mots = page.locator(".mots__texte");
  await expect(mots).toHaveCount(12);
  const liste = await mots.allInnerTexts();
  const continuer = page.getByRole("button", { name: "Continuer" });
  await expect(continuer).toBeDisabled();
  await sansDebordement(page);
  await page.getByText("J'ai noté mes 12 mots en lieu sûr.").click();
  await continuer.click();
  await expect(page.getByText("Clé sauvegardée")).toBeVisible();
  await page.goto("/#/cle");
  await expect(page.getByText("Ce sont les mots de votre clé actuelle.")).toBeVisible();
  expect(await mots.allInnerTexts()).toEqual(liste);
});

test("accessibilité : aucune violation grave sur les écrans principaux", async ({ page }) => {
  await page.goto("/#/bienvenue");
  await auditAccessibilite(page);
  await activerDemo(page);
  await declarerVente(page, "tomates 1500", "1 500");
  for (const ecran of ["/#/", "/#/ventes", "/#/passeport", "/#/reglages", "/#/declarer", "/#/cle", "/#/preteur/p/demo000000"]) {
    await page.goto(ecran);
    await page.waitForLoadState("networkidle");
    await auditAccessibilite(page);
  }
});
