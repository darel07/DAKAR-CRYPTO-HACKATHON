import { expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

/** Aucun débordement horizontal : ce qui se voit à l'œil et jamais en revue de code. */
export async function sansDebordement(page: Page): Promise<void> {
  const deborde = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(deborde, `débordement horizontal sur ${page.url()}`).toBe(false);
}

/** Première ouverture → Bienvenue → mode démonstration (paiements simulés, aucun wallet requis). */
export async function activerDemo(page: Page): Promise<void> {
  await page.goto("/#/bienvenue");
  await page.getByRole("button", { name: "Essayer en mode démonstration" }).click();
  await expect(page.getByText("Mode démonstration").first()).toBeVisible();
}

export async function saisirMontant(page: Page, chiffres: string): Promise<void> {
  for (const c of chiffres) await page.getByRole("button", { name: c, exact: true }).click();
}

/** Enregistre une vente déclarée via E6 (analyse par le serveur, ou règle locale sans clé IA). */
export async function declarerVente(page: Page, texte: string, montant: string): Promise<void> {
  await page.goto("/#/declarer");
  await page.getByLabel("Que s'est-il vendu ?").fill(texte);
  await page.getByRole("button", { name: "Analyser" }).click();
  await expect(page.getByRole("button", { name: `Enregistrer ${montant} FCFA` })).toBeVisible();
  await page.getByRole("button", { name: `Enregistrer ${montant} FCFA` }).click();
  await expect(page.getByText("Vente enregistrée")).toBeVisible();
}

/** Audit axe : aucune violation « grave » ou « critique » (WCAG 2.1 A/AA). */
export async function auditAccessibilite(page: Page): Promise<void> {
  // Attendre la fin des animations d'apparition : mesuré pendant un fondu, un texte à moitié
  // transparent échoue au contraste alors que l'écran posé le respecte. Les boucles infinies
  // (pièce, rubans) sont ignorées.
  // Écran posé : plus de squelette de chargement (les résultats de la vue prêteur arrivent après
  // la vérification, avec un fondu de 140 ms sur chaque chiffre).
  await page.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), null, { timeout: 15_000 });
  // Une animation en pause (hors écran) ne finit jamais : on n'attend que celles qui jouent, 1 s au plus.
  await page.evaluate(() =>
    Promise.race([
      Promise.all(
        document.getAnimations()
          .filter((a) => a.playState === "running" && a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished.catch(() => undefined)),
      ),
      new Promise((ok) => setTimeout(ok, 1000)),
    ]),
  );
  const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const graves = r.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  const detail = graves.map((v) => `${v.id} : ${v.help} → ${v.nodes.map((n) => `${n.target.join(" ")} [${n.any[0]?.message ?? ""}]`).join(" | ")}`);
  expect(detail, page.url()).toEqual([]);
}
