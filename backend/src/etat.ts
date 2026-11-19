import type { Base } from "./base.js";
import type { Config } from "./config.js";
import type { ClientIA } from "./ia/claude.js";
import { creerClientIA } from "./ia/fabrique.js";
import { creerServiceIA, type ServiceIA } from "./ia/service.js";
import { creerDepotPasseports, type DepotPasseports } from "./passeports/depot.js";
import { creerServicePasseports, type ServicePasseports } from "./passeports/service.js";
import { creerDepotRecus } from "./recus/depot.js";
import { creerServiceRecus, type ServiceRecus } from "./recus/service.js";
import { creerDepotTaux } from "./taux/depot.js";
import { FOURNISSEURS_PAR_DEFAUT, type Fournisseur } from "./taux/fournisseurs.js";
import {
  coingeckoHistorique,
  creerServiceHistorique,
  type ServiceHistorique,
  type SourceHistorique,
} from "./taux/historique.js";
import { creerServiceTaux, type ServiceTaux } from "./taux/service.js";

/** Dépendances partagées, construites une fois au démarrage. */
export interface Etat {
  config: Config;
  db: Base;
  ia: ServiceIA;
  taux: ServiceTaux;
  historique: ServiceHistorique;
  passeports: ServicePasseports;
  recus: ServiceRecus;
  depotPasseports: DepotPasseports;
}

/** Points de substitution pour les tests (modèle simulé, fournisseurs de cours simulés). */
export interface Substitutions {
  clientIA?: ClientIA | null;
  fournisseurs?: Fournisseur[];
  sourceHistorique?: SourceHistorique;
  delaiIaMs?: number;
}

export function creerEtat(config: Config, db: Base, sub: Substitutions = {}): Etat {
  const clientIA = sub.clientIA !== undefined ? sub.clientIA : creerClientIA(config);
  const depotPasseports = creerDepotPasseports(db);
  return {
    config,
    db,
    ia: creerServiceIA(clientIA, sub.delaiIaMs),
    taux: creerServiceTaux(creerDepotTaux(db), sub.fournisseurs ?? FOURNISSEURS_PAR_DEFAUT),
    historique: creerServiceHistorique(sub.sourceHistorique ?? coingeckoHistorique),
    passeports: creerServicePasseports(depotPasseports, config.publicUrl),
    recus: creerServiceRecus(creerDepotRecus(db), config.publicUrl),
    depotPasseports,
  };
}
