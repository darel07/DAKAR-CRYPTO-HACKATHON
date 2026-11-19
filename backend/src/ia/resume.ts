import type { CorpsResume } from "./schemas.js";

/** Groupe les milliers avec une espace simple : 87500 → « 87 500 ». */
export const formaterFcfa = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");

/** Résumé construit sans modèle : sert de repli et de référence. */
export function resumeParGabarit(c: CorpsResume): string {
  if (c.nbVentes === 0) return "Aucune vente enregistrée aujourd'hui.";
  const ventes = c.nbVentes === 1 ? "1 vente" : `${c.nbVentes} ventes`;
  const prouve =
    c.totalProuveFcfa > 0 ? `, dont ${formaterFcfa(c.totalProuveFcfa)} FCFA prouvés` : ", toutes déclarées";
  const phrases = [`Aujourd'hui, ${ventes} pour ${formaterFcfa(c.totalFcfa)} FCFA${prouve}.`];
  if (c.meilleureHeure) phrases.push(`Votre meilleure heure : ${c.meilleureHeure}.`);
  if (c.articlesFrequents.length > 0) phrases.push(`Article le plus vendu : ${c.articlesFrequents[0]}.`);
  return phrases.join(" ");
}

/** Nombres que le résumé a le droit de citer : ceux des entrées, et rien d'autre. */
function nombresAutorises(c: CorpsResume): Set<number> {
  const autorises = new Set<number>([c.totalFcfa, c.nbVentes, c.totalProuveFcfa, 1]);
  for (const h of c.meilleureHeure?.match(/\d+/g) ?? []) autorises.add(Number(h));
  for (const p of c.jour.split("-")) autorises.add(Number(p));
  for (const a of c.articlesFrequents) for (const n of a.match(/\d+/g) ?? []) autorises.add(Number(n));
  return autorises;
}

const NOMBRE = /\d{1,3}(?:[ \u00a0\u202f.]\d{3})+(?!\d)|\d+/g;

/** Garde-fou : refuse un résumé trop long, avec un tiret cadratin, ou qui cite un chiffre
 *  absent des entrées (un chiffre inventé dans un relevé d'argent est une faute grave). */
export function resumeAcceptable(texte: string, c: CorpsResume): boolean {
  if (texte.length > 400 || texte.includes("—")) return false;
  const phrases = texte.split(/[.!?](?:\s|$)/).filter((p) => p.trim().length > 0);
  if (phrases.length > 3) return false;
  const autorises = nombresAutorises(c);
  for (const brut of texte.match(NOMBRE) ?? []) {
    if (!autorises.has(Number(brut.replace(/[ \u00a0\u202f.]/g, "")))) return false;
  }
  return true;
}
