import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";

/** La préimage est la preuve du paiement : son SHA-256 doit être le hash de la facture.
 *  Vérifiée avant d'afficher « Paiement reçu » et de marquer la vente « Prouvé », pour qu'un
 *  portefeuille qui renverrait une valeur incohérente ne produise jamais un faux succès. */
export function preimageValide(preimage: string, paymentHash: string): boolean {
  if (!/^[0-9a-f]{64}$/i.test(preimage)) return false;
  try {
    return bytesToHex(sha256(hexToBytes(preimage.toLowerCase()))) === paymentHash.toLowerCase();
  } catch {
    return false;
  }
}
