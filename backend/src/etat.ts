import type { Base } from "./base.js";
import type { Config } from "./config.js";
import { creerClientClaude, type ClientIA } from "./ia/claude.js";
import { creerServiceIA, type ServiceIA } from "./ia/service.js";
import { creerDepotPasseports, type DepotPasseports } from "./passeports/depot.js";
import { creerServicePasseports, type ServicePasseports } from "./passeports/service.js";
import { creerDepotTaux } from "./taux/depot.js";
import { FOURNISSEURS_PAR_DEFAUT, type Fournisseur } from "./taux/fournisseurs.js";
import { creerServiceTaux, type ServiceTaux } from "./taux/service.js";

/** Dépendances partagées, construites une fois au démarrage. */
export interface Etat {
  config: Config;
  db: Base;
  ia: ServiceIA;
  taux: ServiceTaux;
  passeports: ServicePasseports;
  depotPasseports: DepotPasseports;
}

/** Points de substitution pour les tests (modèle simulé, fournisseurs de cours simulés). */
export interface Substitutions {
  clientIA?: ClientIA | null;
  fournisseurs?: Fournisseur[];
  delaiIaMs?: number;
}

export function creerEtat(config: Config, db: Base, sub: Substitutions = {}): Etat {
  const clientIA =
    sub.clientIA !== undefined
      ? sub.clientIA
      : config.anthropicApiKey
        ? creerClientClaude(config.anthropicApiKey, config.iaModele)
        : null;
  const depotPasseports = creerDepotPasseports(db);
  return {
    config,
    db,
    ia: creerServiceIA(clientIA, sub.delaiIaMs),
    taux: creerServiceTaux(creerDepotTaux(db), sub.fournisseurs ?? FOURNISSEURS_PAR_DEFAUT),
    passeports: creerServicePasseports(depotPasseports, config.publicUrl),
    depotPasseports,
  };
}
