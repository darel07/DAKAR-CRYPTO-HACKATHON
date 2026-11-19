import { cleJour } from "./format";
import type { Vente } from "./types";

export type Periode = "jour" | "semaine" | "mois" | "tout";

export const PERIODES = [
  { valeur: "jour", libelle: "Aujourd'hui" },
  { valeur: "semaine", libelle: "Cette semaine" },
  { valeur: "mois", libelle: "Ce mois" },
  { valeur: "tout", libelle: "Toutes les ventes" },
] as const;

/** Début de la période en secondes Unix, à l'heure locale (semaine du lundi, comme au Sénégal). */
function debutPeriode(periode: Periode, maintenant: Date): number {
  const d = new Date(maintenant.getFullYear(), maintenant.getMonth(), maintenant.getDate());
  if (periode === "semaine") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  if (periode === "mois") d.setDate(1);
  return Math.floor(d.getTime() / 1000);
}

export function filtrerPeriode(ventes: Vente[], periode: Periode, maintenant = new Date()): Vente[] {
  if (periode === "tout") return ventes;
  const debut = debutPeriode(periode, maintenant);
  return ventes.filter((v) => v.ts >= debut);
}

/** Aujourd'hui s'il y a déjà des ventes aujourd'hui, sinon tout l'historique (§8 E7). */
export function periodeParDefaut(ventes: Vente[], maintenant = new Date()): Periode {
  const aujourdhui = cleJour(maintenant.getTime() / 1000);
  return ventes.some((v) => cleJour(v.ts) === aujourdhui) ? "jour" : "tout";
}

export interface Totaux { prouve: number; nbProuvees: number; declare: number; nbDeclarees: number }

export function totaux(ventes: Vente[]): Totaux {
  const t: Totaux = { prouve: 0, nbProuvees: 0, declare: 0, nbDeclarees: 0 };
  for (const v of ventes) {
    if (v.type === "lightning") { t.prouve += v.montantFcfa; t.nbProuvees++; }
    else { t.declare += v.montantFcfa; t.nbDeclarees++; }
  }
  return t;
}

/** Cellule CSV : guillemets doublés, et neutralisation des formules (un libellé « =… » ou « +… »
 *  serait exécuté par le tableur à l'ouverture). */
function cellule(texte: string): string {
  const sur = /^[=+\-@\t\r]/.test(texte) ? `'${texte}` : texte;
  return `"${sur.replace(/"/g, '""')}"`;
}

/** CSV de l'historique : date ISO, montant, type, libellé, référence de paiement.
 *  Séparateur « ; » et BOM UTF-8 : c'est ce qu'attend Excel réglé en français (accents compris). */
export function historiqueCsv(ventes: Vente[]): string {
  const lignes = [
    "date;montant_fcfa;type;libelle;reference",
    ...ventes.map((v) => [
      new Date(v.ts * 1000).toISOString(),
      String(v.montantFcfa),
      v.type === "lightning" ? "prouvee" : "declaree",
      cellule(v.libelle),
      v.paymentHash ?? "",
    ].join(";")),
  ];
  return `﻿${lignes.join("\r\n")}\r\n`;
}

/** « ventes-2026-11-19.csv » : date du jour de l'export. */
export const nomExport = (maintenant = new Date()) => `ventes-${cleJour(maintenant.getTime() / 1000)}.csv`;
