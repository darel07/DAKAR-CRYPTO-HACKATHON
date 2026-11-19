import { verifyEvent } from "nostr-tools/pure";
import type { Event } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { decode } from "light-bolt11-decoder";
import type { ContenuPasseport, LignePasseport } from "../domain/types";
import { confirmationValide } from "./confirmation";
import { montantCoherent, type NiveauControle, type ReferenceCours } from "./controleMontants";
import { fluxVersOctets, KIND } from "./passeport";

// Côté prêteur (E12) seulement : ce module et le décodeur de factures ne sont chargés qu'avec la
// vue prêteur. Le commerçant signe (passeport.ts), il ne vérifie jamais.

/** Part du flux mensuel que l'on propose comme plafond indicatif (règle d'une IMF nigériane). */
export const PART_PLAFOND = 0.2;

const depuisBase64Url = (s: string) =>
  Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

export async function decoder(charge: string): Promise<Event> {
  const flux = new Blob([depuisBase64Url(charge) as BlobPart]).stream().pipeThrough(new DecompressionStream("deflate"));
  return JSON.parse(new TextDecoder().decode(await fluxVersOctets(flux))) as Event;
}

export interface Verification {
  signatureValide: boolean;
  auteur: string;
  contenu: ContenuPasseport | null;
  totalProuve: number;
  totalDeclare: number;
  nbProuvees: number;
  nbDeclarees: number;
  /** Lignes Lightning dont la préimage ne correspond pas à la facture. */
  preuvesRejetees: number;
  /** Lignes Lightning payées, mais dont le montant FCFA ne correspond pas aux sats payés (#37). */
  montantsRejetes: number;
  /** Précision du contrôle des montants, selon le cours de référence disponible. */
  controle: NiveauControle;
  /** Paiements prouvés confirmés par une signature valide du client (#18). */
  nbContresignees: number;
  /** Nombre de clés de clients différentes parmi ces confirmations. */
  clientsDistincts: number;
  jours: number;
  /** Plafond indicatif sur le flux total, ramené à 30 jours. */
  plafondTotal: number;
  /** Plafond indicatif sur le seul prouvé, ramené à 30 jours. */
  plafondProuve: number;
}

type LigneLightning = Exclude<LignePasseport, [number, number, "D"]>;

/** Sats réellement payés et hash du paiement si la préimage correspond à la facture, sinon null.
 *  La section `amount` du décodeur est en millisatoshis. */
function paiement(ligne: LigneLightning): { sats: number; hash: string } | null {
  try {
    const [, , , facture, preimage] = ligne;
    const decodee = decode(facture);
    const hash = (decodee.sections.find((s) => s.name === "payment_hash")?.value as string | undefined)?.toLowerCase();
    const msat = Number(decodee.sections.find((s) => s.name === "amount")?.value);
    if (!hash || !(msat > 0)) return null;
    return bytesToHex(sha256(hexToBytes(preimage))) === hash ? { sats: msat / 1000, hash } : null;
  } catch {
    return null;
  }
}

/** `reference` : cours obtenu par le prêteur lui-même, jamais lu dans le passeport. */
export function verifier(evenement: Event, reference: ReferenceCours = { niveau: "plage" }): Verification {
  const signatureValide = evenement.kind === KIND && verifyEvent(evenement);
  let contenu: ContenuPasseport | null = null;
  try {
    const c = JSON.parse(evenement.content) as ContenuPasseport;
    contenu = c.v === 1 && Array.isArray(c.lignes) ? c : null;
  } catch { contenu = null; }

  let totalProuve = 0, totalDeclare = 0, nbProuvees = 0, nbDeclarees = 0, preuvesRejetees = 0, montantsRejetes = 0;
  const clients = new Set<string>();
  let nbContresignees = 0;
  for (const ligne of contenu?.lignes ?? []) {
    if (ligne[1] <= 0 || !Number.isFinite(ligne[1])) continue;
    if (ligne[2] !== "L") { totalDeclare += ligne[1]; nbDeclarees++; continue; }
    const p = paiement(ligne);
    if (p === null) { preuvesRejetees++; continue; }
    if (!montantCoherent(ligne[1], p.sats, ligne[0], reference)) { montantsRejetes++; continue; }
    totalProuve += ligne[1]; nbProuvees++;
    const confirmation = ligne[5];
    if (confirmationValide(confirmation, p.hash, evenement.pubkey)) { nbContresignees++; clients.add(confirmation.pubkey); }
  }
  const jours = contenu ? Math.max(1, Math.round((contenu.fin - contenu.debut) / 86400)) : 1;
  const parMois = (x: number) => (x / jours) * 30;
  return {
    signatureValide, auteur: evenement.pubkey, contenu,
    totalProuve, totalDeclare, nbProuvees, nbDeclarees, preuvesRejetees, montantsRejetes, controle: reference.niveau, nbContresignees, clientsDistincts: clients.size, jours,
    plafondTotal: Math.round(parMois(totalProuve + totalDeclare) * PART_PLAFOND),
    plafondProuve: Math.round(parMois(totalProuve) * PART_PLAFOND),
  };
}
