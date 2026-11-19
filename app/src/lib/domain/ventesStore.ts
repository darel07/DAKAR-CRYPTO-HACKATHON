import { useSyncExternalStore } from "react";
import type { TypeVente, Vente } from "./types";

// Stockage local uniquement : aucune vente ne quitte le téléphone sans que le
// commerçant génère un passeport. Si le JSON est corrompu on repart d'une liste vide.
const CLE = "passeport.ventes.v1";

let ventes: Vente[] = lire();
const abonnes = new Set<() => void>();

function lire(): Vente[] {
  try {
    const brut = localStorage.getItem(CLE);
    const analyse: unknown = brut ? JSON.parse(brut) : [];
    return Array.isArray(analyse) ? (analyse as Vente[]) : [];
  } catch {
    return [];
  }
}

function emettre(suivantes: Vente[]) {
  ventes = suivantes;
  try { localStorage.setItem(CLE, JSON.stringify(ventes)); } catch { /* stockage plein ou bloqué : on garde la mémoire */ }
  abonnes.forEach((cb) => cb());
}

export function ajouterVente(v: Omit<Vente, "id" | "ts"> & { ts?: number }): Vente {
  const vente: Vente = { ...v, id: crypto.randomUUID(), ts: v.ts ?? Math.floor(Date.now() / 1000) };
  emettre([vente, ...ventes].sort((a, b) => b.ts - a.ts));
  return vente;
}

/** Complète une vente existante (reçu déposé, confirmation du client). Sans effet si elle a disparu. */
export function mettreAJourVente(id: string, complement: Partial<Pick<Vente, "recuId" | "confirmation">>): void {
  if (!ventes.some((v) => v.id === id)) return;
  emettre(ventes.map((v) => (v.id === id ? { ...v, ...complement } : v)));
}

/** Lecture ponctuelle hors React (après une mise à jour asynchrone). */
export const lireVentes = (): Vente[] => ventes;

export function supprimerToutes() { emettre([]); }

export function useVentes(): Vente[] {
  return useSyncExternalStore(
    (cb) => { abonnes.add(cb); return () => abonnes.delete(cb); },
    () => ventes,
  );
}

/** Données d'exemple : uniquement des ventes DÉCLARÉES, jamais de fausse preuve Lightning. */
export function chargerExemple() {
  const articles: [string, number][] = [
    ["2 sacs de riz", 15000], ["Huile 5 litres", 6500], ["Sucre 3 kg", 2400], ["Savon x6", 1800],
    ["Lait en poudre", 3200], ["Tomates 2 kg", 1500], ["Oignons 5 kg", 4000],
  ];
  const jour = 86400;
  const maintenant = Math.floor(Date.now() / 1000);
  const exemples: Vente[] = [];
  for (let i = 0; i < 21; i++) {
    const [libelle, montantFcfa] = articles[i % articles.length]!;
    const type: TypeVente = "declaree";
    exemples.push({ id: crypto.randomUUID(), ts: maintenant - Math.floor(i / 2) * jour - (i % 2) * 3600, montantFcfa, type, libelle });
  }
  emettre([...exemples, ...ventes].sort((a, b) => b.ts - a.ts));
}
