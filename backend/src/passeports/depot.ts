import type { Base } from "../base.js";

export interface PasseportStocke {
  id: string;
  charge: string;
  expireLe: number;
}

export interface DepotPasseports {
  parEmpreinte(empreinte: string, instant: number): PasseportStocke | null;
  parId(id: string, instant: number): PasseportStocke | null;
  /** Insère, en remplaçant une entrée expirée de même empreinte. */
  inserer(p: { id: string; empreinte: string; charge: string; creeLe: number; expireLe: number }): void;
  /** Crée ou rafraîchit une entrée à identifiant fixe (passeport de démonstration). */
  remplacer(p: { id: string; empreinte: string; charge: string; creeLe: number; expireLe: number }): void;
  purgerExpires(instant: number): number;
}

type Ligne = { id: string; charge: string; expire_le: number };
const versStocke = (l: Ligne | undefined): PasseportStocke | null =>
  l ? { id: l.id, charge: l.charge, expireLe: l.expire_le } : null;

export function creerDepotPasseports(db: Base): DepotPasseports {
  const parEmpreinte = db.prepare<[string, number], Ligne>(
    "SELECT id, charge, expire_le FROM passeports WHERE empreinte = ? AND expire_le > ?",
  );
  const parId = db.prepare<[string, number], Ligne>(
    "SELECT id, charge, expire_le FROM passeports WHERE id = ? AND expire_le > ?",
  );
  const supprimerEmpreinte = db.prepare<[string]>("DELETE FROM passeports WHERE empreinte = ?");
  const supprimerId = db.prepare<[string]>("DELETE FROM passeports WHERE id = ?");
  const inserer = db.prepare<[string, string, string, number, number]>(
    "INSERT INTO passeports (id, empreinte, charge, cree_le, expire_le) VALUES (?, ?, ?, ?, ?)",
  );
  const purger = db.prepare<[number]>("DELETE FROM passeports WHERE expire_le <= ?");

  return {
    parEmpreinte: (e, t) => versStocke(parEmpreinte.get(e, t)),
    parId: (id, t) => versStocke(parId.get(id, t)),
    inserer: db.transaction((p) => {
      supprimerEmpreinte.run(p.empreinte);
      inserer.run(p.id, p.empreinte, p.charge, p.creeLe, p.expireLe);
    }),
    remplacer: db.transaction((p) => {
      supprimerId.run(p.id);
      supprimerEmpreinte.run(p.empreinte);
      inserer.run(p.id, p.empreinte, p.charge, p.creeLe, p.expireLe);
    }),
    purgerExpires: (t) => purger.run(t).changes,
  };
}
