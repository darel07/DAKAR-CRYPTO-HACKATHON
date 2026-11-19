import { appelerApi } from "../api";
import { cleJour, formatFcfa } from "../domain/format";
import { estProuvee } from "../domain/statut";
import type { Vente } from "../domain/types";

/** Corps de POST /api/ia/resume : des chiffres agrégés, jamais un libellé de vente complet. */
export interface EntreeResume {
  jour: string;
  totalFcfa: number;
  nbVentes: number;
  totalProuveFcfa: number;
  meilleureHeure: string | null;
  articlesFrequents: string[];
}

/** Mots qui ne désignent pas un article : quantités, unités, contenants. */
const MOTS_VIDES = new Set([
  "de", "du", "des", "la", "le", "les", "un", "une", "et", "en", "au", "aux", "pour",
  "kg", "g", "l", "litre", "litres", "sac", "sacs", "sachet", "sachets", "paquet", "paquets",
  "boite", "boites", "boîte", "boîtes", "bouteille", "bouteilles", "carton", "cartons", "pot", "pots",
]);

/** Premier mot porteur d'un libellé (« 2 sacs de riz » → « riz », « Huile 5 litres » → « huile »). */
function article(libelle: string): string | null {
  const mots = libelle.toLowerCase().normalize("NFC").match(/\p{L}+/gu) ?? [];
  const mot = mots.find((m) => m.length >= 3 && !MOTS_VIDES.has(m));
  return mot ? mot.slice(0, 40) : null;
}

/** Agrège les ventes du jour ; null s'il n'y en a aucune (la carte est alors masquée). */
export function entreeResume(ventes: Vente[], maintenant = new Date()): EntreeResume | null {
  const jour = cleJour(maintenant.getTime() / 1000);
  const du = ventes.filter((v) => cleJour(v.ts) === jour);
  if (du.length === 0) return null;

  const parHeure = new Map<number, number>();
  for (const v of du) {
    const h = new Date(v.ts * 1000).getHours();
    parHeure.set(h, (parHeure.get(h) ?? 0) + v.montantFcfa);
  }
  const [heure] = [...parHeure].sort((a, b) => b[1] - a[1])[0]!;

  const frequences = new Map<string, number>();
  for (const v of du) {
    if (v.type === "lightning") continue; // « Paiement Lightning » n'est pas un article
    const a = article(v.libelle);
    if (a) frequences.set(a, (frequences.get(a) ?? 0) + 1);
  }

  return {
    jour,
    totalFcfa: du.reduce((s, v) => s + v.montantFcfa, 0),
    nbVentes: du.length,
    totalProuveFcfa: du.filter(estProuvee).reduce((s, v) => s + v.montantFcfa, 0),
    meilleureHeure: du.length > 1 ? `${heure}h-${heure + 1}h` : null,
    articlesFrequents: [...frequences].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([a]) => a),
  };
}

/** Repli local, sur le même gabarit que le backend. */
export function resumeLocal(e: EntreeResume): string {
  const ventes = e.nbVentes > 1 ? `${e.nbVentes} ventes` : "1 vente";
  const preuve = e.totalProuveFcfa === 0 ? "."
    : e.totalProuveFcfa === e.totalFcfa ? `, ${e.nbVentes > 1 ? "toutes prouvées" : "prouvée"}.`
    : `, dont ${formatFcfa(e.totalProuveFcfa)} prouvés.`;
  const heure = e.meilleureHeure ? ` Votre meilleure heure : ${e.meilleureHeure}.` : "";
  return `Aujourd'hui, ${ventes} pour ${formatFcfa(e.totalFcfa)}${preuve}${heure}`;
}

const DELAI = 6000;
/** Une demande par jeu de chiffres et par session : revenir sur l'écran, ou le voir passer dans
 *  un balayage, ne rappelle pas l'IA. */
const cache = new Map<string, Promise<string>>();

/** Texte de l'IA via le backend ; le gabarit local si le backend ou l'IA ne répond pas. */
export function resumerJour(e: EntreeResume): Promise<string> {
  const cle = JSON.stringify(e);
  const connu = cache.get(cle);
  if (connu) return connu;
  const promesse = (navigator.onLine === false
    ? Promise.reject(new Error("hors ligne"))
    : appelerApi<{ resume?: unknown }>("/ia/resume", {
      delai: DELAI,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: cle },
    }).then((r) => {
      if (typeof r.resume !== "string" || !r.resume.trim()) throw new Error("réponse vide");
      return r.resume.trim();
    })
  ).catch(() => {
    cache.delete(cle); // nouvel essai à la prochaine visite
    return resumeLocal(e);
  });
  cache.set(cle, promesse);
  return promesse;
}
