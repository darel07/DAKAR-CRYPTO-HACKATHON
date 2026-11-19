import type { Base } from "../base.js";

export interface CoursStocke {
  fcfaParBtc: number;
  source: string;
  majLe: number;
}

export interface DepotTaux {
  lire(): CoursStocke | null;
  ecrire(cours: CoursStocke): void;
}

export function creerDepotTaux(db: Base): DepotTaux {
  const lire = db.prepare<[], { fcfa_par_btc: number; source: string; maj_le: number }>(
    "SELECT fcfa_par_btc, source, maj_le FROM taux_cache WHERE cle = 'BTC_XOF'",
  );
  const ecrire = db.prepare<[number, string, number]>(
    `INSERT INTO taux_cache (cle, fcfa_par_btc, source, maj_le) VALUES ('BTC_XOF', ?, ?, ?)
     ON CONFLICT (cle) DO UPDATE SET fcfa_par_btc = excluded.fcfa_par_btc,
       source = excluded.source, maj_le = excluded.maj_le`,
  );
  return {
    lire() {
      const l = lire.get();
      return l ? { fcfaParBtc: l.fcfa_par_btc, source: l.source, majLe: l.maj_le } : null;
    },
    ecrire(c) {
      ecrire.run(c.fcfaParBtc, c.source, c.majLe);
    },
  };
}
