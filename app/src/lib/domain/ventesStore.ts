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

/** Identifiant de vente (UUID v4). crypto.randomUUID n'existe qu'en contexte sécurisé (https ou
 *  localhost) : sur un téléphone qui ouvre le serveur par son adresse réseau (http://192.168.x.x),
 *  il manque, et chaque vente (paiement démo, vente déclarée) échouait à l'enregistrement.
 *  getRandomValues existe partout. */
function nouvelId(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const o = crypto.getRandomValues(new Uint8Array(16));
  o[6] = (o[6]! & 0x0f) | 0x40; // version 4
  o[8] = (o[8]! & 0x3f) | 0x80; // variante RFC 4122
  const h = Array.from(o, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export function ajouterVente(v: Omit<Vente, "id" | "ts"> & { ts?: number }): Vente {
  const vente: Vente = { ...v, id: nouvelId(), ts: v.ts ?? Math.floor(Date.now() / 1000) };
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
    exemples.push({ id: nouvelId(), ts: maintenant - Math.floor(i / 2) * jour - (i % 2) * 3600, montantFcfa, type, libelle });
  }
  emettre([...exemples, ...ventes].sort((a, b) => b.ts - a.ts));
}
