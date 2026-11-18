export interface VenteAnalysee {
  libelle: string;
  montantFcfa: number;
}

/** Interface du moteur d'analyse : la version locale ci-dessous peut être remplacée
 *  par un appel à Claude côté serveur sans toucher aux écrans. */
export type AnalyseurVente = (texte: string) => VenteAnalysee | null;

const MOTIF_MONTANT = /(\d[\d\s.  ]*\d|\d)(\s*(k|mille))?/gi;

/** v1 locale et déterministe : « 2 sacs de riz, 15 000 » -> {libellé, montant}.
 *  Choix volontaire de la règle simple (dernier nombre = montant) : un montant mal
 *  deviné est une erreur d'argent, donc l'écran exige TOUJOURS une confirmation. */
export const analyserVenteLocale: AnalyseurVente = (texte) => {
  const nettoye = texte.trim();
  if (!nettoye) return null;
  const trouvailles = [...nettoye.matchAll(MOTIF_MONTANT)];
  const derniere = trouvailles.at(-1);
  if (!derniere || derniere.index === undefined) return null;

  const chiffres = (derniere[1] ?? "").replace(/[\s.  ]/g, "");
  let montant = Number(chiffres);
  if (derniere[3]) montant *= 1000;
  if (!Number.isFinite(montant) || montant <= 0) return null;

  const avant = nettoye.slice(0, derniere.index).replace(/[,;:\-\s]+$/g, "").trim();
  const apres = nettoye.slice(derniere.index + derniere[0].length).replace(/^\s*(fcfa|f|cfa|francs?)\b/i, "").trim();
  const libelle = (avant || apres || "Vente").replace(/^[,;:\-\s]+/, "");
  return { libelle, montantFcfa: montant };
};
