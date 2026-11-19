import { verifyEvent } from "nostr-tools/pure";
import type { Event } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { decode } from "light-bolt11-decoder";
import type { ContenuPasseport, LignePasseport } from "../domain/types";
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
  jours: number;
  /** Plafond indicatif sur le flux total, ramené à 30 jours. */
  plafondTotal: number;
  /** Plafond indicatif sur le seul prouvé, ramené à 30 jours. */
  plafondProuve: number;
}

type LigneLightning = Extract<LignePasseport, [number, number, "L", string, string]>;

/** Sats réellement payés si la préimage correspond au hash de la facture, sinon null.
 *  La section `amount` du décodeur est en millisatoshis. */
function satsPayes(ligne: LigneLightning): number | null {
  try {
    const [, , , facture, preimage] = ligne;
    const decodee = decode(facture);
    const hash = decodee.sections.find((s) => s.name === "payment_hash")?.value as string | undefined;
    const msat = Number(decodee.sections.find((s) => s.name === "amount")?.value);
    if (!hash || !(msat > 0)) return null;
    return bytesToHex(sha256(hexToBytes(preimage))) === hash.toLowerCase() ? msat / 1000 : null;
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
  for (const ligne of contenu?.lignes ?? []) {
    if (ligne[1] <= 0 || !Number.isFinite(ligne[1])) continue;
    if (ligne[2] !== "L") { totalDeclare += ligne[1]; nbDeclarees++; continue; }
    const sats = satsPayes(ligne);
    if (sats === null) preuvesRejetees++;
    else if (!montantCoherent(ligne[1], sats, ligne[0], reference)) montantsRejetes++;
    else { totalProuve += ligne[1]; nbProuvees++; }
  }
  const jours = contenu ? Math.max(1, Math.round((contenu.fin - contenu.debut) / 86400)) : 1;
  const parMois = (x: number) => (x / jours) * 30;
  return {
    signatureValide, auteur: evenement.pubkey, contenu,
    totalProuve, totalDeclare, nbProuvees, nbDeclarees, preuvesRejetees, montantsRejetes, controle: reference.niveau, jours,
    plafondTotal: Math.round(parMois(totalProuve + totalDeclare) * PART_PLAFOND),
    plafondProuve: Math.round(parMois(totalProuve) * PART_PLAFOND),
  };
}
