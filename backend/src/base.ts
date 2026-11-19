import Database from "better-sqlite3";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export type Base = Database.Database;

const DOSSIER_MIGRATIONS = join(dirname(fileURLToPath(import.meta.url)), "..", "migrations");

/** Ouvre la base, règle WAL et le délai d'attente, puis applique les migrations dans l'ordre.
 *  Une migration appliquée n'est jamais rejouée ni modifiée : on en ajoute une nouvelle. */
export function ouvrirBase(chemin: string): Base {
  if (chemin !== ":memory:") mkdirSync(dirname(chemin), { recursive: true });
  const db = new Database(chemin);
  db.pragma("journal_mode = WAL");
  db.pragma("busy_timeout = 5000");
  db.pragma("foreign_keys = ON");
  migrer(db);
  return db;
}

function migrer(db: Base): void {
  db.exec("CREATE TABLE IF NOT EXISTS migrations (nom TEXT PRIMARY KEY, appliquee_le INTEGER NOT NULL)");
  const appliquees = new Set(
    db
      .prepare<[], { nom: string }>("SELECT nom FROM migrations")
      .all()
      .map((l) => l.nom),
  );
  const fichiers = readdirSync(DOSSIER_MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  const noter = db.prepare("INSERT INTO migrations (nom, appliquee_le) VALUES (?, ?)");
  for (const fichier of fichiers) {
    if (appliquees.has(fichier)) continue;
    const sql = readFileSync(join(DOSSIER_MIGRATIONS, fichier), "utf8");
    db.transaction(() => {
      db.exec(sql);
      noter.run(fichier, Math.floor(Date.now() / 1000));
    })();
  }
}
