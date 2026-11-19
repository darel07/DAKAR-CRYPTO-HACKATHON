import { finalizeEvent, generateSecretKey, verifyEvent } from "nostr-tools/pure";
import type { EventTemplate } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import { appelerApi, ErreurApi } from "../api";
import type { EvenementSigne } from "../domain/types";
import { decoder } from "./verification";

// Reçu client contresigné (#18), côté CLIENT (E13). Ce module n'est chargé qu'avec cette page.

const KIND_APPLICATION = 30078;
const CLE_CLIENT = "caisse.client.cle.v1";
const DELAI_MS = 8000;
const HEX64 = /^[0-9a-f]{64}$/;

export interface RecuLu {
  montantFcfa: number;
  ts: number;
  libelle: string | null;
  paymentHash: string;
  commercant: string;
  dejaConfirme: boolean;
  /** Paiement simulé (mode démonstration du commerçant). */
  demo: boolean;
}

/** Extension de navigateur Nostr (NIP-07) : si le client en a une, c'est sa vraie identité. */
interface Nip07 { signEvent(e: EventTemplate): Promise<EvenementSigne> }
const extension = (): Nip07 | undefined => (window as unknown as { nostr?: Nip07 }).nostr;

/** Lit le reçu et vérifie la signature du commerçant : le serveur n'est pas cru sur parole. */
export async function lireRecu(id: string, signal: AbortSignal): Promise<RecuLu | null> {
  const r = await appelerApi<{ charge?: unknown; confirmation?: unknown }>(`/recus/${id}`, { signal, delai: DELAI_MS });
  if (typeof r.charge !== "string") return null;
  const ev = await decoder(r.charge);
  if (ev.kind !== KIND_APPLICATION || !verifyEvent(ev)) return null;
  const c = JSON.parse(ev.content) as Partial<{ montantFcfa: number; ts: number; libelle: string; paymentHash: string; demo: boolean }>;
  const hash = typeof c.paymentHash === "string" ? c.paymentHash : "";
  const d = ev.tags.find((t) => t[0] === "d")?.[1];
  if (!HEX64.test(hash) || d !== `recu:${hash}` || !(Number(c.montantFcfa) > 0) || typeof c.ts !== "number") return null;
  return {
    montantFcfa: Number(c.montantFcfa), ts: c.ts, libelle: c.libelle?.slice(0, 80) || null,
    paymentHash: hash, commercant: ev.pubkey, dejaConfirme: r.confirmation != null, demo: c.demo === true,
  };
}

/** Clé du client sur ce téléphone, créée au premier usage : réutilisée, elle permet au prêteur
 *  de compter des clients différents plutôt que des confirmations. */
function cleClient(): Uint8Array {
  try {
    const existante = localStorage.getItem(CLE_CLIENT);
    if (existante) return hexToBytes(existante);
  } catch { /* clé de session */ }
  const cle = generateSecretKey();
  try { localStorage.setItem(CLE_CLIENT, bytesToHex(cle)); } catch { /* non persistée */ }
  return cle;
}

export type IssueConfirmation = "confirme" | "deja" | "refuse" | "injoignable";

/** Signe « j'ai bien fait cet achat » (extension NIP-07 si présente) et l'envoie au serveur. */
export async function confirmerAchat(id: string, recu: RecuLu): Promise<IssueConfirmation> {
  const modele: EventTemplate = {
    kind: KIND_APPLICATION,
    created_at: Math.floor(Date.now() / 1000),
    tags: [["d", `confirmation:${recu.paymentHash}`], ["p", recu.commercant]],
    content: "",
  };
  const nip07 = extension();
  const evenement = nip07 ? await nip07.signEvent(modele) : finalizeEvent(modele, cleClient());
  try {
    await appelerApi(`/recus/${id}/confirmation`, {
      delai: DELAI_MS,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ evenement }) },
    });
    return "confirme";
  } catch (e) {
    if (e instanceof ErreurApi && e.statut === 409) return "deja";
    if (e instanceof ErreurApi && e.statut === 422) return "refuse";
    return "injoignable";
  }
}
