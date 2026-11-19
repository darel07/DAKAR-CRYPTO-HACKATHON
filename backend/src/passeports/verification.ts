import { inflateSync } from "node:zlib";
import { verifyEvent, type Event } from "nostr-tools/pure";
import { z } from "zod";

export const KIND_PASSEPORT = 30078;
export const ETIQUETTE = "passeport-revenus";
export const CHARGE_MAX = 64 * 1024;
export const LIGNES_MAX = 5_000;
/** Plafond de décompression : protège contre une « bombe » deflate (petite charge, énorme JSON). */
const DECOMPRESSE_MAX = 2 * 1024 * 1024;

const Evenement = z.object({
  id: z.string().regex(/^[0-9a-f]{64}$/),
  pubkey: z.string().regex(/^[0-9a-f]{64}$/),
  created_at: z.number().int(),
  kind: z.literal(KIND_PASSEPORT),
  tags: z.array(z.array(z.string())),
  content: z.string(),
  sig: z.string().regex(/^[0-9a-f]{128}$/),
});

const Ligne = z.union([
  z.tuple([z.number(), z.number(), z.literal("L"), z.string(), z.string()]),
  z.tuple([z.number(), z.number(), z.literal("D")]),
]);

const Contenu = z.object({
  v: z.literal(1),
  devise: z.literal("XOF"),
  debut: z.number().int(),
  fin: z.number().int(),
  lignes: z.array(Ligne).max(LIGNES_MAX),
});

/** Inverse de `encoder()` du front : base64url → deflate (zlib) → JSON. */
export function decoderCharge(charge: string): unknown {
  if (!/^[A-Za-z0-9_-]+$/.test(charge)) throw new Error("alphabet base64url attendu");
  const brut = inflateSync(Buffer.from(charge, "base64url"), { maxOutputLength: DECOMPRESSE_MAX });
  return JSON.parse(brut.toString("utf8"));
}

/** Vérifie qu'une charge est bien un passeport signé. Le serveur ne recalcule aucun total :
 *  la vue prêteur re-vérifie tout côté client. Ce contrôle empêche seulement d'utiliser
 *  le service comme hébergement gratuit de données arbitraires. */
export function chargeValide(charge: string): boolean {
  try {
    const evenement = Evenement.safeParse(decoderCharge(charge));
    if (!evenement.success) return false;
    const e: Event = evenement.data;
    if (!e.tags.some((t) => t[0] === "d" && t[1] === ETIQUETTE)) return false;
    if (!Contenu.safeParse(JSON.parse(e.content)).success) return false;
    return verifyEvent(e);
  } catch {
    return false;
  }
}
