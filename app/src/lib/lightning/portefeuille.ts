import { NWCClient } from "@getalby/sdk";
import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex } from "@noble/hashes/utils.js";

/** Une facture créée pour une vente. */
export interface Facture {
  bolt11: string;
  paymentHash: string;
  /** Secondes Unix. */
  expireLe: number;
}

export interface PaiementRecu {
  preimage: string;
  paymentHash: string;
}

export class ErreurWallet extends Error {
  constructor(message: string, readonly cause?: unknown) { super(message); }
}

/** Contrat minimal dont l'application a besoin. Les écrans ne connaissent ni NWC ni Alby. */
export interface Portefeuille {
  mode: "nwc" | "demo";
  creerFacture(sats: number, description: string): Promise<Facture>;
  /** Résout dès que la facture est réglée ; rejette sur annulation ou expiration. */
  attendrePaiement(facture: Facture, signal: AbortSignal): Promise<PaiementRecu>;
  fermer(): void;
}

const INTERVALLE_MS = 2000;

function pause(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal.addEventListener("abort", () => { clearTimeout(t); reject(new DOMException("annulé", "AbortError")); }, { once: true });
  });
}

export function ouvrirNwc(urlConnexion: string): Portefeuille {
  let client: NWCClient;
  try {
    client = new NWCClient({ nostrWalletConnectUrl: urlConnexion.trim() });
  } catch (e) {
    throw new ErreurWallet("Ce lien de connexion n'est pas valide. Copiez-le à nouveau depuis votre wallet.", e);
  }
  return {
    mode: "nwc",
    async creerFacture(sats, description) {
      try {
        // NIP-47 exprime les montants en millisatoshis.
        const tx = await client.makeInvoice({ amount: sats * 1000, description, expiry: 600 });
        return { bolt11: tx.invoice, paymentHash: tx.payment_hash, expireLe: tx.expires_at };
      } catch (e) {
        throw new ErreurWallet("Impossible de créer la facture. Vérifiez la connexion du wallet et réessayez.", e);
      }
    },
    async attendrePaiement(facture, signal) {
      // On interroge le wallet plutôt que de compter sur une notification : c'est plus
      // lent de quelques secondes mais fonctionne avec tous les wallets, même sans notifications.
      while (!signal.aborted) {
        if (Date.now() / 1000 > facture.expireLe) throw new ErreurWallet("La facture a expiré. Relancez l'encaissement.");
        try {
          const tx = await client.lookupInvoice({ payment_hash: facture.paymentHash });
          if (tx.state === "settled" && tx.preimage) return { preimage: tx.preimage, paymentHash: facture.paymentHash };
        } catch { /* échec réseau ponctuel : on réessaie au prochain tour */ }
        await pause(INTERVALLE_MS, signal);
      }
      throw new DOMException("annulé", "AbortError");
    },
    fermer() { client.close(); },
  };
}

/** Mode démonstration : règle la facture après quelques secondes, sans réseau.
 *  À n'utiliser que pour développer ou filmer ; l'interface l'affiche toujours. */
export function ouvrirDemo(): Portefeuille {
  const preimages = new Map<string, string>();
  return {
    mode: "demo",
    async creerFacture(sats) {
      const secret = crypto.getRandomValues(new Uint8Array(32));
      const paymentHash = bytesToHex(sha256(secret));
      preimages.set(paymentHash, bytesToHex(secret));
      return { bolt11: `lndemo${sats}n1${paymentHash.slice(0, 40)}`, paymentHash, expireLe: Math.floor(Date.now() / 1000) + 600 };
    },
    async attendrePaiement(facture, signal) {
      await pause(4000, signal);
      return { preimage: preimages.get(facture.paymentHash) ?? "", paymentHash: facture.paymentHash };
    },
    fermer() { preimages.clear(); },
  };
}
