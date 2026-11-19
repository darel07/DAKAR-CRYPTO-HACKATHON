import { finalizeEvent } from "nostr-tools/pure";
import { appelerApi } from "../api";
import type { EvenementSigne, Vente } from "../domain/types";
import { lireVentes, mettreAJourVente } from "../domain/ventesStore";
import { confirmationValide } from "./confirmation";
import { encoder, KIND, lireOuCreerCle } from "./passeport";

// Reçu client contresigné (#18), côté commerçant.
//
// Le reçu est signé par la clé du commerçant puis déposé sur le serveur (lien court) ; le client
// le confirme depuis son propre téléphone (E13). La confirmation est un événement autonome
// (d = confirmation:<paymentHash>, p = clé du commerçant) : le prêteur la revérifie sans le serveur.

const DELAI_DEPOT_MS = 8000;
const DELAI_LECTURE_MS = 5000;
const EN_PARALLELE = 4;
const ID_VALIDE = /^[0-9A-Za-z]{10}$/;

/** Adresse de la page client, construite depuis l'origine courante (comme le lien du passeport). */
export const lienRecu = (id: string) => `${window.location.origin}${window.location.pathname}#/recu-client/r/${id}`;

/** Signe et dépose le reçu d'une vente Lightning ; réutilise le dépôt précédent s'il existe.
 *  Lève une erreur sans serveur : un reçu n'a de valeur que s'il peut être confirmé. */
export async function deposerRecu(vente: Vente): Promise<string> {
  if (vente.recuId) return vente.recuId;
  if (vente.type !== "lightning" || !vente.paymentHash) throw new Error("vente sans paiement Lightning");
  // Le serveur exige un hash en hexadécimal minuscule ; le client signera sur ce même hash.
  const paymentHash = vente.paymentHash.toLowerCase();
  // Un paiement simulé n'est jamais présenté comme prouvé, pas même au client.
  const contenu = { v: 1, montantFcfa: vente.montantFcfa, ts: vente.ts, paymentHash, libelle: vente.libelle.slice(0, 80), ...(vente.demo ? { demo: true } : {}) };
  const evenement = finalizeEvent(
    { kind: KIND, created_at: Math.floor(Date.now() / 1000), tags: [["d", `recu:${paymentHash}`]], content: JSON.stringify(contenu) },
    lireOuCreerCle(),
  );
  const r = await appelerApi<{ id?: unknown }>("/recus", {
    delai: DELAI_DEPOT_MS,
    init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charge: await encoder(evenement) }) },
  });
  if (typeof r.id !== "string" || !ID_VALIDE.test(r.id)) throw new Error("identifiant invalide");
  mettreAJourVente(vente.id, { recuId: r.id });
  return r.id;
}

async function lireConfirmation(vente: Vente, commercant: string, signal: AbortSignal): Promise<boolean> {
  const r = await appelerApi<{ confirmation?: EvenementSigne | null }>(`/recus/${vente.recuId}`, { signal, delai: DELAI_LECTURE_MS });
  const c = r.confirmation;
  if (!c || !vente.paymentHash || !confirmationValide(c, vente.paymentHash, commercant)) return false;
  mettreAJourVente(vente.id, { confirmation: c });
  return true;
}

/** Avant de générer le passeport : récupère les confirmations arrivées depuis l'envoi des reçus.
 *  4 requêtes à la fois au plus ; une erreur (serveur éteint, reçu expiré) est ignorée : la vente
 *  reste simplement non confirmée. Renvoie le nombre de nouvelles confirmations. */
export async function recupererConfirmations(commercant: string, signal: AbortSignal): Promise<number> {
  const enAttente = lireVentes().filter((v) => v.recuId && !v.confirmation && !v.demo);
  let trouvees = 0;
  for (let i = 0; i < enAttente.length; i += EN_PARALLELE) {
    const lot = enAttente.slice(i, i + EN_PARALLELE).map((v) => lireConfirmation(v, commercant, signal).catch(() => false));
    trouvees += (await Promise.all(lot)).filter(Boolean).length;
  }
  return trouvees;
}
