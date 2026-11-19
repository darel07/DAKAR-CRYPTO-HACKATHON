import { construireApp } from "./app.js";
import { ouvrirBase } from "./base.js";
import { lireConfig } from "./config.js";
import { semerDemo } from "./demo.js";
import { creerEtat } from "./etat.js";

const UNE_HEURE_MS = 3_600_000;

/** Composition : configuration → base → état → routes → écoute. Rien d'autre. */
async function demarrer(): Promise<void> {
  const config = lireConfig();
  const db = ouvrirBase(config.databasePath);
  const etat = creerEtat(config, db);
  const app = await construireApp(etat);

  if (!etat.ia.active) app.log.warn("ANTHROPIC_API_KEY absente : analyse et résumé par règles locales");
  if (config.seedDemo) semerDemo(etat.depotPasseports);

  // Nettoyage des passeports expirés dans le processus (limite connue : un seul réplica).
  const nettoyage = setInterval(() => etat.passeports.purger(), UNE_HEURE_MS);
  nettoyage.unref();

  const arreter = async () => {
    clearInterval(nettoyage);
    await app.close();
    db.close();
    process.exit(0);
  };
  process.once("SIGTERM", arreter);
  process.once("SIGINT", arreter);

  await app.listen({ host: config.host, port: config.port });
}

demarrer().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
