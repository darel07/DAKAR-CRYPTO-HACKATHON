import { verifyEvent } from "nostr-tools/pure";
import type { Event } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { decode } from "light-bolt11-decoder";
import type { ContenuPasseport, LignePasseport } from "../domain/types";
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
  /** Lignes Lightning dont la preuve ne tient pas (préimage ou montant incohérent). */
  preuvesRejetees: number;
  jours: number;
  /** Plafond indicatif sur le flux total, ramené à 30 jours. */
  plafondTotal: number;
  /** Plafond indicatif sur le seul prouvé, ramené à 30 jours. */
  plafondProuve: number;
}

/** Une ligne Lightning est acceptée si la préimage correspond au hash de la facture
 *  et si le montant de la facture (sats) est cohérent avec une vente non nulle. */
function preuveValide(ligne: Extract<LignePasseport, [number, number, "L", string, string]>): boolean {
  try {
    const [, , , facture, preimage] = ligne;
    const decodee = decode(facture);
    const hash = decodee.sections.find((s) => s.name === "payment_hash")?.value as string | undefined;
    const montant = decodee.sections.find((s) => s.name === "amount")?.value as string | undefined;
    if (!hash || !montant || Number(montant) <= 0) return false;
    return bytesToHex(sha256(hexToBytes(preimage))) === hash.toLowerCase();
  } catch {
    return false;
  }
}

export function verifier(evenement: Event): Verification {
  const signatureValide = evenement.kind === KIND && verifyEvent(evenement);
  let contenu: ContenuPasseport | null = null;
  try {
    const c = JSON.parse(evenement.content) as ContenuPasseport;
    contenu = c.v === 1 && Array.isArray(c.lignes) ? c : null;
  } catch { contenu = null; }

  let totalProuve = 0, totalDeclare = 0, nbProuvees = 0, nbDeclarees = 0, preuvesRejetees = 0;
  for (const ligne of contenu?.lignes ?? []) {
    if (ligne[1] <= 0 || !Number.isFinite(ligne[1])) continue;
    if (ligne[2] === "L" && preuveValide(ligne)) { totalProuve += ligne[1]; nbProuvees++; }
    else if (ligne[2] === "L") { preuvesRejetees++; }
    else { totalDeclare += ligne[1]; nbDeclarees++; }
  }
  const jours = contenu ? Math.max(1, Math.round((contenu.fin - contenu.debut) / 86400)) : 1;
  const parMois = (x: number) => (x / jours) * 30;
  return {
    signatureValide, auteur: evenement.pubkey, contenu,
    totalProuve, totalDeclare, nbProuvees, nbDeclarees, preuvesRejetees, jours,
    plafondTotal: Math.round(parMois(totalProuve + totalDeclare) * PART_PLAFOND),
    plafondProuve: Math.round(parMois(totalProuve) * PART_PLAFOND),
  };
}
