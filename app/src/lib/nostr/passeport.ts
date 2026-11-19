import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import type { Event } from "nostr-tools/pure";
import { bytesToHex, hexToBytes } from "@noble/hashes/utils.js";
import type { ContenuPasseport, LignePasseport, Vente } from "../domain/types";

const CLE_SECRETE = "passeport.cle.v1";
/** Kind 30078 : données d'application remplaçables (NIP-78), adressées par la balise « d ». */
export const KIND = 30078;
const ETIQUETTE = "passeport-revenus";

export function lireOuCreerCle(): Uint8Array {
  try {
    const existante = localStorage.getItem(CLE_SECRETE);
    if (existante) return hexToBytes(existante);
  } catch { /* on génère une clé de session */ }
  const cle = generateSecretKey();
  try { localStorage.setItem(CLE_SECRETE, bytesToHex(cle)); } catch { /* clé non persistée */ }
  return cle;
}

export const clePublique = () => getPublicKey(lireOuCreerCle());

/** Remplace l'identité de signature (restauration par 12 mots). */
export function enregistrerCle(cle: Uint8Array): void {
  localStorage.setItem(CLE_SECRETE, bytesToHex(cle));
}

export function construireContenu(ventes: Vente[], jours: number, maintenant = Math.floor(Date.now() / 1000)): ContenuPasseport {
  const debut = maintenant - jours * 86400;
  const lignes: LignePasseport[] = ventes
    .filter((v) => v.ts >= debut)
    .map((v): LignePasseport =>
      v.type === "lightning" && v.facture && v.preimage
        ? v.confirmation
          ? [v.ts, v.montantFcfa, "L", v.facture, v.preimage, v.confirmation]
          : [v.ts, v.montantFcfa, "L", v.facture, v.preimage]
        : [v.ts, v.montantFcfa, "D"],
    );
  return { v: 1, devise: "XOF", debut, fin: maintenant, lignes };
}

export function signerPasseport(contenu: ContenuPasseport): Event {
  return finalizeEvent(
    { kind: KIND, created_at: contenu.fin, tags: [["d", ETIQUETTE]], content: JSON.stringify(contenu) },
    lireOuCreerCle(),
  );
}

// ---- Transport : JSON compressé en base64url, lisible sans serveur ----

const versBase64Url = (octets: Uint8Array) =>
  btoa(String.fromCharCode(...octets)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

export async function fluxVersOctets(flux: ReadableStream<Uint8Array>): Promise<Uint8Array> {
  return new Uint8Array(await new Response(flux).arrayBuffer());
}

export async function encoder(evenement: Event): Promise<string> {
  const brut = new TextEncoder().encode(JSON.stringify(evenement));
  const flux = new Blob([brut as BlobPart]).stream().pipeThrough(new CompressionStream("deflate"));
  return versBase64Url(await fluxVersOctets(flux));
}
