import { cleJour } from "./format";
import { estProuvee, statutVente } from "./statut";
import type { Vente } from "./types";

const JOUR = 86400;

export interface Activite {
  total: number;
  nombre: number;
  panierMoyen: number;
  /** Part prouvée du chiffre d'affaires, de 0 à 1 ; null sans vente. */
  partProuvee: number | null;
}

/** « Mon activité » : les 30 derniers jours. */
export function activite(ventes: Vente[], maintenant = Math.floor(Date.now() / 1000)): Activite {
  const recentes = ventes.filter((v) => v.ts >= maintenant - 30 * JOUR);
  const total = recentes.reduce((s, v) => s + v.montantFcfa, 0);
  const prouve = recentes.filter(estProuvee).reduce((s, v) => s + v.montantFcfa, 0);
  return {
    total,
    nombre: recentes.length,
    panierMoyen: recentes.length ? Math.round(total / recentes.length) : 0,
    partProuvee: total > 0 ? prouve / total : null,
  };
}

const court = new Intl.DateTimeFormat("fr-FR", { weekday: "short" });
const long = new Intl.DateTimeFormat("fr-FR", { weekday: "long" });

/** Un jour du mini graphique (même forme que JourGraphe). */
export interface TotalJour { court: string; long: string; valeur: number }

/** Totaux des 7 derniers jours (aujourd'hui compris), du plus ancien au plus récent. */
export function semaine(ventes: Vente[], maintenant = new Date()): TotalJour[] {
  const totaux = new Map<string, number>();
  for (const v of ventes) totaux.set(cleJour(v.ts), (totaux.get(cleJour(v.ts)) ?? 0) + v.montantFcfa);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate() - (6 - i), 12);
    return { court: court.format(d), long: long.format(d), valeur: totaux.get(cleJour(d.getTime() / 1000)) ?? 0 };
  });
}

export interface ApercuPasseport {
  prouve: number;
  nbProuvees: number;
  declare: number;
  nbDeclarees: number;
  /** Ventes du mode démonstration : dans le passeport, l'agent les verra rejetées. */
  nbDemo: number;
}

/** Ce que l'agent verra comme prouvé ou déclaré (une vente Lightning sans facture ou sans préimage
 *  y est déclarée ; une vente démo y est rejetée), calculé sans signer. Signer à chaque affichage
 *  coûtait une signature Schnorr par rendu, jusque dans la page voisine d'un balayage. */
export function apercuPasseport(ventes: Vente[], jours: number, maintenant = Math.floor(Date.now() / 1000)): ApercuPasseport {
  const a: ApercuPasseport = { prouve: 0, nbProuvees: 0, declare: 0, nbDeclarees: 0, nbDemo: 0 };
  for (const v of ventes) {
    if (v.ts < maintenant - jours * JOUR || v.montantFcfa <= 0) continue;
    const statut = statutVente(v);
    if (statut === "demo") a.nbDemo++;
    else if (statut === "prouve" && v.facture && v.preimage) { a.prouve += v.montantFcfa; a.nbProuvees++; }
    else { a.declare += v.montantFcfa; a.nbDeclarees++; }
  }
  return a;
}
