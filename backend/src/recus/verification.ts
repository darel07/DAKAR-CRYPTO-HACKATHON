import { verifyEvent, type Event } from "nostr-tools/pure";
import { z } from "zod";
import { decoderCharge } from "../passeports/verification.js";

/** Reçu et confirmation sont des données d'application Nostr (NIP-78), adressées par « d ». */
export const KIND_APPLICATION = 30078;
export const CHARGE_RECU_MAX = 8 * 1024;
const HEX64 = /^[0-9a-f]{64}$/;

const Evenement = z.object({
  id: z.string().regex(HEX64),
  pubkey: z.string().regex(HEX64),
  created_at: z.number().int(),
  kind: z.literal(KIND_APPLICATION),
  tags: z.array(z.array(z.string()).max(4)).max(8),
  content: z.string().max(2048),
  sig: z.string().regex(/^[0-9a-f]{128}$/),
});

export const ContenuRecu = z.object({
  v: z.literal(1),
  montantFcfa: z.number().int().positive().max(10_000_000),
  ts: z.number().int(),
  paymentHash: z.string().regex(HEX64),
  libelle: z.string().max(80).optional(),
});

export interface RecuVerifie {
  paymentHash: string;
  auteur: string;
  ts: number;
}

const balise = (e: Event, nom: string) => e.tags.find((t) => t[0] === nom)?.[1];

/** Reçu signé par le commerçant : kind 30078, d = « recu:<paymentHash> », contenu ContenuRecu.
 *  Renvoie null si la charge n'est pas un reçu valide. */
export function verifierRecu(charge: string): RecuVerifie | null {
  try {
    const ev = Evenement.safeParse(decoderCharge(charge));
    if (!ev.success || !verifyEvent(ev.data)) return null;
    const contenu = ContenuRecu.safeParse(JSON.parse(ev.data.content));
    if (!contenu.success) return null;
    if (balise(ev.data, "d") !== `recu:${contenu.data.paymentHash}`) return null;
    return { paymentHash: contenu.data.paymentHash, auteur: ev.data.pubkey, ts: contenu.data.ts };
  } catch {
    return null;
  }
}

export const SchemaConfirmation = Evenement;
export type Confirmation = z.infer<typeof SchemaConfirmation>;

/** Confirmation signée par le client : kind 30078, d = « confirmation:<paymentHash> »,
 *  p = clé du commerçant, signée par une AUTRE clé que celle du commerçant.
 *  Elle est autonome : la vue prêteur peut la revérifier à partir de la seule ligne du passeport. */
export function confirmationValide(e: Event, recu: RecuVerifie, instant: number): boolean {
  if (e.kind !== KIND_APPLICATION || !verifyEvent(e)) return false;
  if (balise(e, "d") !== `confirmation:${recu.paymentHash}`) return false;
  if (balise(e, "p") !== recu.auteur || e.pubkey === recu.auteur) return false;
  return e.created_at >= recu.ts - 3600 && e.created_at <= instant + 600;
}
