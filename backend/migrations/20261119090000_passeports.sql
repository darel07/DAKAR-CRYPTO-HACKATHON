CREATE TABLE IF NOT EXISTS passeports (
  id         TEXT PRIMARY KEY CHECK (length(id) = 10),
  empreinte  TEXT NOT NULL UNIQUE CHECK (length(empreinte) = 64),
  charge     TEXT NOT NULL CHECK (length(charge) <= 65536),
  cree_le    INTEGER NOT NULL,
  expire_le  INTEGER NOT NULL CHECK (expire_le > cree_le)
);
CREATE INDEX IF NOT EXISTS passeports_expire ON passeports (expire_le);

CREATE TABLE IF NOT EXISTS taux_cache (
  cle          TEXT PRIMARY KEY CHECK (cle = 'BTC_XOF'),
  fcfa_par_btc REAL NOT NULL CHECK (fcfa_par_btc > 0),
  source       TEXT NOT NULL,
  maj_le       INTEGER NOT NULL
);
