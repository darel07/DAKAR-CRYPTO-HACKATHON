CREATE TABLE IF NOT EXISTS recus (
  id            TEXT PRIMARY KEY CHECK (length(id) = 10),
  empreinte     TEXT NOT NULL UNIQUE CHECK (length(empreinte) = 64),
  charge        TEXT NOT NULL CHECK (length(charge) <= 8192),
  payment_hash  TEXT NOT NULL CHECK (length(payment_hash) = 64),
  auteur        TEXT NOT NULL CHECK (length(auteur) = 64),
  confirmation  TEXT CHECK (confirmation IS NULL OR length(confirmation) <= 4096),
  confirme_le   INTEGER,
  cree_le       INTEGER NOT NULL,
  expire_le     INTEGER NOT NULL CHECK (expire_le > cree_le)
);
CREATE INDEX IF NOT EXISTS recus_expire ON recus (expire_le);
