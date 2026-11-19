import { verifyEvent } from "nostr-tools/pure";
import type { EvenementSigne } from "../domain/types";

/** Kind 30078 : données d'application (NIP-78), comme le passeport et le reçu. */
const KIND_APPLICATION = 30078;

/** Une confirmation de client (#18) n'est retenue que si elle tient seule : bonne signature,
 *  même paiement (d = confirmation:<paymentHash>), adressée à ce commerçant (p) et signée par
 *  une AUTRE clé que la sienne. Utilisée par le commerçant (avant de l'enregistrer) et par le
 *  prêteur (qui ne fait confiance ni au commerçant ni au serveur). */
export function confirmationValide(e: unknown, paymentHash: string, commercant: string): e is EvenementSigne {
  if (!e || typeof e !== "object") return false;
  const ev = e as EvenementSigne;
  if (!Array.isArray(ev.tags)) return false;
  const balise = (nom: string) => ev.tags.find((t) => Array.isArray(t) && t[0] === nom)?.[1];
  try {
    return ev.kind === KIND_APPLICATION && balise("d") === `confirmation:${paymentHash.toLowerCase()}`
      && balise("p") === commercant && ev.pubkey !== commercant && verifyEvent(ev);
  } catch {
    return false;
  }
}
