import type { Base } from "../base.js";

export interface RecuStocke {
  id: string;
  charge: string;
  paymentHash: string;
  auteur: string;
  confirmation: string | null;
  confirmeLe: number | null;
  expireLe: number;
}

export interface NouveauRecu {
  id: string;
  empreinte: string;
  charge: string;
  paymentHash: string;
  auteur: string;
  creeLe: number;
  expireLe: number;
}

export interface DepotRecus {
  parEmpreinte(empreinte: string, instant: number): RecuStocke | null;
  parId(id: string, instant: number): RecuStocke | null;
  inserer(r: NouveauRecu): void;
  /** Enregistre la confirmation seulement si aucune n'existe encore. Renvoie true si écrite. */
  confirmer(id: string, confirmation: string, instant: number): boolean;
  purgerExpires(instant: number): number;
}

type Ligne = {
  id: string;
  charge: string;
  payment_hash: string;
  auteur: string;
  confirmation: string | null;
  confirme_le: number | null;
  expire_le: number;
};

const COLONNES = "id, charge, payment_hash, auteur, confirmation, confirme_le, expire_le";

const versStocke = (l: Ligne | undefined): RecuStocke | null =>
  l
    ? {
        id: l.id,
        charge: l.charge,
        paymentHash: l.payment_hash,
        auteur: l.auteur,
        confirmation: l.confirmation,
        confirmeLe: l.confirme_le,
        expireLe: l.expire_le,
      }
    : null;

export function creerDepotRecus(db: Base): DepotRecus {
  const parEmpreinte = db.prepare<[string, number], Ligne>(
    `SELECT ${COLONNES} FROM recus WHERE empreinte = ? AND expire_le > ?`,
  );
  const parId = db.prepare<[string, number], Ligne>(
    `SELECT ${COLONNES} FROM recus WHERE id = ? AND expire_le > ?`,
  );
  const supprimerEmpreinte = db.prepare<[string]>("DELETE FROM recus WHERE empreinte = ?");
  const inserer = db.prepare<[string, string, string, string, string, number, number]>(
    `INSERT INTO recus (id, empreinte, charge, payment_hash, auteur, cree_le, expire_le)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );
  const confirmer = db.prepare<[string, number, string]>(
    "UPDATE recus SET confirmation = ?, confirme_le = ? WHERE id = ? AND confirmation IS NULL",
  );
  const purger = db.prepare<[number]>("DELETE FROM recus WHERE expire_le <= ?");

  return {
    parEmpreinte: (e, t) => versStocke(parEmpreinte.get(e, t)),
    parId: (id, t) => versStocke(parId.get(id, t)),
    inserer: db.transaction((r: NouveauRecu) => {
      supprimerEmpreinte.run(r.empreinte);
      inserer.run(r.id, r.empreinte, r.charge, r.paymentHash, r.auteur, r.creeLe, r.expireLe);
    }),
    // La condition « confirmation IS NULL » est dans la requête : pas de course entre lecture et écriture.
    confirmer: (id, c, t) => confirmer.run(c, t, id).changes === 1,
    purgerExpires: (t) => purger.run(t).changes,
  };
}
