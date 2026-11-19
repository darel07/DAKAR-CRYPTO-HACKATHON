import { useSyncExternalStore } from "react";
import { avecDelai } from "../api";
import { fcfaVersSats } from "../fx/taux";
import type { Taux } from "../fx/taux";
import type { Facture, Portefeuille } from "../lightning/portefeuille";
import { formatFcfa } from "./format";
import type { Vente } from "./types";

/** Un portefeuille qui ne répond pas en 15 s est considéré injoignable. */
const DELAI_FACTURE_MS = 15_000;

// État de l'encaissement partagé entre l'Accueil (E3), « Faire payer le client » (E4)
// et « Paiement reçu » (E5) : chaque écran a sa route (retour Android), donc l'état
// ne peut pas vivre dans un seul composant.
//  - saisie : le montant tapé survit à un aller-retour vers E4 (annulation) ;
//  - demande : la facture en attente, gardée en sessionStorage pour survivre à un
//    rechargement de la page pendant que le client paie ;
//  - recu : la dernière vente confirmée par le portefeuille, pour E5.

export interface DemandePaiement {
  facture: Facture;
  montantFcfa: number;
  sats: number;
  /** Secondes Unix de création (début de l'anneau du compte à rebours). */
  creeLe: number;
}

export interface PaiementRecu {
  vente: Vente;
  sats: number;
}

interface Etat {
  saisie: string;
  demande: DemandePaiement | null;
  recu: PaiementRecu | null;
}

const CLE_DEMANDE = "caisse.demande.v1";

function lireDemande(): DemandePaiement | null {
  try {
    const brut = sessionStorage.getItem(CLE_DEMANDE);
    const d = brut ? (JSON.parse(brut) as DemandePaiement) : null;
    return d && typeof d.facture?.bolt11 === "string" && d.facture.expireLe > Date.now() / 1000 ? d : null;
  } catch {
    return null;
  }
}

let etat: Etat = { saisie: "", demande: lireDemande(), recu: null };
const abonnes = new Set<() => void>();

function emettre(suivant: Partial<Etat>) {
  etat = { ...etat, ...suivant };
  abonnes.forEach((cb) => cb());
}

export function modifierSaisie(saisie: string): void { emettre({ saisie }); }

export function demarrerDemande(demande: DemandePaiement): void {
  try { sessionStorage.setItem(CLE_DEMANDE, JSON.stringify(demande)); } catch { /* mémoire seulement */ }
  emettre({ demande });
}

/** Crée la facture auprès du portefeuille (15 s maximum) et l'enregistre comme demande en cours.
 *  Lève une erreur si le portefeuille ne répond pas : l'écran affiche « Impossible de contacter… ». */
export async function creerDemande(portefeuille: Portefeuille, montantFcfa: number, taux: Taux): Promise<DemandePaiement> {
  const sats = fcfaVersSats(montantFcfa, taux);
  const facture = await avecDelai(
    portefeuille.creerFacture(sats, `Caisse Lightning : ${formatFcfa(montantFcfa)}`),
    DELAI_FACTURE_MS,
  );
  const demande = { facture, montantFcfa, sats, creeLe: Math.floor(Date.now() / 1000) };
  demarrerDemande(demande);
  return demande;
}

export function abandonnerDemande(): void {
  try { sessionStorage.removeItem(CLE_DEMANDE); } catch { /* ignoré */ }
  emettre({ demande: null });
}

/** Appelé UNIQUEMENT quand le portefeuille a renvoyé la préimage. Remet la saisie à zéro. */
export function confirmerPaiement(recu: PaiementRecu): void {
  try { sessionStorage.removeItem(CLE_DEMANDE); } catch { /* ignoré */ }
  emettre({ demande: null, recu, saisie: "" });
}

export function useEncaissement(): Etat {
  return useSyncExternalStore(
    (cb) => { abonnes.add(cb); return () => { abonnes.delete(cb); }; },
    () => etat,
    () => etat,
  );
}
