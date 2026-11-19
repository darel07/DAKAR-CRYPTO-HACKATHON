import { createHash, randomBytes } from "node:crypto";
import { erreurs } from "../erreurs.js";
import type { DepotPasseports } from "./depot.js";
import { CHARGE_MAX, chargeValide } from "./verification.js";

export const DUREE_VIE_S = 30 * 86_400;
export const FORMAT_ID = /^[0-9A-Za-z]{10}$/;
const BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";

/** 10 caractères base62 tirés sans biais (rejet des octets ≥ 248). */
export function nouvelIdentifiant(): string {
  let id = "";
  while (id.length < 10) {
    for (const octet of randomBytes(16)) {
      if (octet < 248 && id.length < 10) id += BASE62[octet % 62];
    }
  }
  return id;
}

export const empreinte = (charge: string) => createHash("sha256").update(charge).digest("hex");
const maintenant = () => Math.floor(Date.now() / 1000);

export interface ServicePasseports {
  creer(charge: string): { id: string; url: string; expireLe: number };
  lire(id: string): { charge: string; expireLe: number };
  purger(): number;
}

export function creerServicePasseports(depot: DepotPasseports, publicUrl: string): ServicePasseports {
  const lien = (id: string) => `${publicUrl}/#/preteur/p/${id}`;
  return {
    creer(charge) {
      if (charge.length > CHARGE_MAX) throw erreurs.tropGros("Ce passeport est trop volumineux.");
      if (!chargeValide(charge)) throw erreurs.validation("Ce passeport n'est pas valide.");
      const t = maintenant();
      const e = empreinte(charge);
      const existant = depot.parEmpreinte(e, t);
      if (existant) return { id: existant.id, url: lien(existant.id), expireLe: existant.expireLe };
      const p = { id: nouvelIdentifiant(), empreinte: e, charge, creeLe: t, expireLe: t + DUREE_VIE_S };
      depot.inserer(p);
      return { id: p.id, url: lien(p.id), expireLe: p.expireLe };
    },
    lire(id) {
      const introuvable = erreurs.introuvable("Ce passeport n'existe pas ou a expiré.");
      if (!FORMAT_ID.test(id)) throw introuvable;
      const p = depot.parId(id, maintenant());
      if (!p) throw introuvable;
      return { charge: p.charge, expireLe: p.expireLe };
    },
    purger: () => depot.purgerExpires(maintenant()),
  };
}
