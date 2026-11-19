import { erreurs } from "../erreurs.js";
import { empreinte, FORMAT_ID, nouvelIdentifiant } from "../passeports/service.js";
import type { DepotRecus, RecuStocke } from "./depot.js";
import {
  CHARGE_RECU_MAX,
  confirmationValide,
  SchemaConfirmation,
  verifierRecu,
  type Confirmation,
} from "./verification.js";

/** Un reçu vit 90 jours : la plus longue période d'un passeport. */
export const DUREE_VIE_RECU_S = 90 * 86_400;
const maintenant = () => Math.floor(Date.now() / 1000);

export interface ServiceRecus {
  creer(charge: string): { id: string; url: string; expireLe: number };
  lire(id: string): { charge: string; expireLe: number; confirmation: Confirmation | null };
  confirmer(id: string, evenement: Confirmation): { confirmeLe: number };
  purger(): number;
}

function trouver(depot: DepotRecus, id: string): RecuStocke {
  const introuvable = erreurs.introuvable("Ce reçu n'existe pas ou a expiré.");
  if (!FORMAT_ID.test(id)) throw introuvable;
  const r = depot.parId(id, maintenant());
  if (!r) throw introuvable;
  return r;
}

/** Stocke un reçu signé (vérifié d'abord) ; même charge ⇒ même identifiant. */
function creerRecu(depot: DepotRecus, charge: string) {
  if (charge.length > CHARGE_RECU_MAX) throw erreurs.tropGros("Ce reçu est trop volumineux.");
  const recu = verifierRecu(charge);
  if (!recu) throw erreurs.validation("Ce reçu n'est pas valide.");
  const t = maintenant();
  const e = empreinte(charge);
  const existant = depot.parEmpreinte(e, t);
  if (existant) return { id: existant.id, expireLe: existant.expireLe };
  const id = nouvelIdentifiant();
  depot.inserer({ id, empreinte: e, charge, ...recu, creeLe: t, expireLe: t + DUREE_VIE_RECU_S });
  return { id, expireLe: t + DUREE_VIE_RECU_S };
}

/** Enregistre la confirmation du client, une seule fois, après vérification complète. */
function confirmerRecu(depot: DepotRecus, id: string, evenement: Confirmation) {
  const r = trouver(depot, id);
  const recu = verifierRecu(r.charge);
  const t = maintenant();
  if (!recu || !confirmationValide(evenement, recu, t))
    throw erreurs.validation("Cette confirmation n'est pas valide.");
  if (r.confirmation) return dejaConfirme(r, evenement);
  if (!depot.confirmer(id, JSON.stringify(evenement), t)) return dejaConfirme(trouver(depot, id), evenement);
  return { confirmeLe: t };
}

export function creerServiceRecus(depot: DepotRecus, publicUrl: string): ServiceRecus {
  return {
    creer(charge) {
      const { id, expireLe } = creerRecu(depot, charge);
      return { id, url: `${publicUrl}/#/recu-client/r/${id}`, expireLe };
    },
    lire(id) {
      const r = trouver(depot, id);
      const confirmation = r.confirmation ? SchemaConfirmation.parse(JSON.parse(r.confirmation)) : null;
      return { charge: r.charge, expireLe: r.expireLe, confirmation };
    },
    confirmer: (id, evenement) => confirmerRecu(depot, id, evenement),
    purger: () => depot.purgerExpires(maintenant()),
  };
}

/** Rejouer la même confirmation est sans effet ; une confirmation différente est refusée. */
function dejaConfirme(r: RecuStocke, evenement: Confirmation): { confirmeLe: number } {
  const existante = JSON.parse(r.confirmation ?? "null") as Confirmation | null;
  if (existante?.id === evenement.id && r.confirmeLe !== null) return { confirmeLe: r.confirmeLe };
  throw erreurs.conflit("Cet achat a déjà été confirmé.");
}
