/** Lecture des jetons de mouvement (tokens.css) depuis le JS : une seule source pour les durées
 *  et courbes, y compris leur passage à 0 quand le mouvement réduit est demandé. */
export function lireJeton(nom: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(nom).trim();
}

/** Durée d'un jeton (« 320ms » ou « 0.32s ») en millisecondes. */
export function dureeJeton(nom: string): number {
  const brut = lireJeton(nom);
  const n = parseFloat(brut);
  if (!Number.isFinite(n)) return 0;
  return brut.endsWith("ms") ? n : n * 1000;
}
