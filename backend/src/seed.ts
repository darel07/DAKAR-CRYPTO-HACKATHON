import { ouvrirBase } from "./base.js";
import { lireConfig } from "./config.js";
import { ID_DEMO, semerDemo } from "./demo.js";
import { creerDepotPasseports } from "./passeports/depot.js";

/** `npm run seed` : crée ou rafraîchit le passeport de démonstration (idempotent). */
const config = lireConfig();
const db = ouvrirBase(config.databasePath);
semerDemo(creerDepotPasseports(db));
db.close();
console.log(`Passeport de démonstration prêt : ${config.publicUrl}/#/preteur/p/${ID_DEMO}`);
