import type { Vente } from "./types";

export type StatutVente = "prouve" | "demo" | "declare";

/** Prouvée seulement si le portefeuille l'a vraiment réglée. Une vente du mode démonstration a une
 *  facture factice que la vue prêteur rejette : elle n'est jamais affichée ni comptée « Prouvé ».
 *  (Les ventes démo d'avant le marqueur `demo` se reconnaissent à leur facture « lndemo… ».) */
export function statutVente(v: Vente): StatutVente {
  if (v.type !== "lightning") return "declare";
  return v.demo === true || v.facture?.startsWith("lndemo") === true ? "demo" : "prouve";
}

export const estProuvee = (v: Vente) => statutVente(v) === "prouve";
