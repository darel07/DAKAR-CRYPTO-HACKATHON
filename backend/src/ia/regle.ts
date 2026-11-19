import { MONTANT_MAX, type VenteIA } from "./schemas.js";

/** Portage exact de app/src/lib/ia/analyserVente.ts (règle du front) :
 *  le dernier nombre est le montant ; « 15 000 », « 15.000 », « 15k », « 15 mille ». */
const MOTIF_MONTANT = /(\d[\d\s.\u00a0\u202f]*\d|\d)(\s*(k|mille))?/gi;

interface Trouvaille {
  libelle: string;
  montantFcfa: number;
}

function analyserLocale(texte: string): Trouvaille | null {
  const nettoye = texte.trim();
  if (!nettoye) return null;
  const derniere = [...nettoye.matchAll(MOTIF_MONTANT)].at(-1);
  if (!derniere || derniere.index === undefined) return null;

  const chiffres = (derniere[1] ?? "").replace(/[\s.\u00a0\u202f]/g, "");
  let montant = Number(chiffres);
  if (derniere[3]) montant *= 1000;
  if (!Number.isFinite(montant) || montant <= 0) return null;

  const avant = nettoye
    .slice(0, derniere.index)
    .replace(/[,;:\-\s]+$/g, "")
    .trim();
  const apres = nettoye
    .slice(derniere.index + derniere[0].length)
    .replace(/^\s*(fcfa|f|cfa|francs?)\b/i, "")
    .trim();
  const libelle = (avant || apres || "Vente").replace(/^[,;:\-\s]+/, "");
  return { libelle, montantFcfa: montant };
}

function detecterMoyen(texte: string): VenteIA["moyen"] {
  const t = texte.toLowerCase();
  if (/\bwave\b/.test(t)) return "wave";
  if (/\borange\s*money\b|\bom\b/.test(t)) return "orange_money";
  if (/\besp[eè]ces?\b|\bcash\b|\bliquide\b/.test(t)) return "especes";
  return null;
}

/** Repli déterministe, utilisé quand l'IA est absente, en panne ou peu sûre. */
export function analyserParRegle(texte: string): VenteIA {
  const trouvaille = analyserLocale(texte);
  const montant =
    trouvaille && Number.isInteger(trouvaille.montantFcfa) && trouvaille.montantFcfa <= MONTANT_MAX
      ? trouvaille.montantFcfa
      : null;
  const libelle = (montant !== null && trouvaille ? trouvaille.libelle : texte.trim()).slice(0, 80);
  const quantite = Number(/^(\d{1,4})\s+\D/.exec(libelle)?.[1] ?? Number.NaN);
  return {
    libelle,
    quantite: Number.isInteger(quantite) && quantite > 0 ? quantite : null,
    montantFcfa: montant,
    moyen: detecterMoyen(texte),
    confiance: "basse",
  };
}
