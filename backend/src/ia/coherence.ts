import { analyserParRegle } from "./regle.js";
import type { VenteIA } from "./schemas.js";

// Garde-fou contre un montant inventé par le modèle, quel que soit le fournisseur.
// Mesuré le 20/11 : un petit modèle local répondait 15 000 FCFA à « bonjour ».

const NOMBRE_EN_LETTRES =
  /\b(un|une|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|onze|douze|treize|quatorze|quinze|seize|vingt|trente|quarante|cinquante|soixante|cent|cents|mille|million)s?\b/i;

/** Vrai si la phrase contient au moins un nombre, en chiffres ou en lettres. */
export const contientUnNombre = (texte: string) => /\d/.test(texte) || NOMBRE_EN_LETTRES.test(texte);

/** Corrige la proposition du modèle :
 *  - aucun nombre dans la phrase : aucun montant possible, confiance basse ;
 *  - désaccord avec la règle locale sur le montant : confiance basse (l'écran dit « Vérifiez »). */
const mots = (t: string) =>
  new Set(
    t
      .toLowerCase()
      .normalize("NFC")
      .match(/\p{L}{3,}/gu) ?? [],
  );

/** Le libellé doit venir de la phrase : au moins un mot en commun, sinon celui de la règle locale. */
function libelleDeLaPhrase(texte: string, libelle: string): string {
  const dansTexte = mots(texte);
  return [...mots(libelle)].some((m) => dansTexte.has(m)) ? libelle : analyserParRegle(texte).libelle;
}

export function rendreCoherent(texte: string, proposition: VenteIA): VenteIA {
  const vente = { ...proposition, libelle: libelleDeLaPhrase(texte, proposition.libelle) };
  if (vente.montantFcfa !== null && !contientUnNombre(texte)) {
    return { ...vente, montantFcfa: null, quantite: null, confiance: "basse" };
  }
  const regle = analyserParRegle(texte).montantFcfa;
  if (regle !== null && vente.montantFcfa !== null && regle !== vente.montantFcfa) {
    return { ...vente, confiance: "basse" };
  }
  return vente;
}
