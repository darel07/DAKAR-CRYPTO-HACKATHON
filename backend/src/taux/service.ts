import type { FastifyBaseLogger } from "fastify";
import { erreurs } from "../erreurs.js";
import type { DepotTaux } from "./depot.js";
import { DELAI_FOURNISSEUR_MS, XOF_PAR_EUR, type Fournisseur, type NomSource } from "./fournisseurs.js";

export const DUREE_CACHE_S = 60;
const ECART_MAX = 0.25;
const FRAICHEUR_REFERENCE_S = 3600;

export interface Taux {
  fcfaParBtc: number;
  majLe: number;
  source: NomSource;
  enCache: boolean;
}

export interface ServiceTaux {
  obtenir(log: FastifyBaseLogger): Promise<Taux>;
  /** État en mémoire, sans appel réseau (pour /api/sante). */
  etat(): { disponible: boolean; majLe: number | null };
}

const maintenant = () => Math.floor(Date.now() / 1000);

/** Rejette un cours aberrant : nul, non fini, ou à plus de 25 % du dernier cours récent. */
export function coursPlausible(nouveau: number, reference: Taux | null, instant = maintenant()): boolean {
  if (!Number.isFinite(nouveau) || nouveau <= 0) return false;
  if (!reference || instant - reference.majLe > FRAICHEUR_REFERENCE_S) return true;
  return Math.abs(nouveau - reference.fcfaParBtc) / reference.fcfaParBtc <= ECART_MAX;
}

function versTaux(depot: DepotTaux): Taux | null {
  const s = depot.lire();
  if (!s || (s.source !== "coingecko" && s.source !== "mempool")) return null;
  return { fcfaParBtc: s.fcfaParBtc, majLe: s.majLe, source: s.source, enCache: true };
}

/** Interroge les fournisseurs dans l'ordre ; le premier cours plausible l'emporte. */
async function interroger(
  fournisseurs: Fournisseur[],
  reference: Taux | null,
  log: FastifyBaseLogger,
): Promise<Taux | null> {
  for (const f of fournisseurs) {
    try {
      const eur = await f.btcEnEur(AbortSignal.timeout(DELAI_FOURNISSEUR_MS));
      const fcfa = Math.round(eur * XOF_PAR_EUR);
      if (coursPlausible(fcfa, reference))
        return { fcfaParBtc: fcfa, majLe: maintenant(), source: f.nom, enCache: false };
      log.warn({ source: f.nom, propose: fcfa, reference: reference?.fcfaParBtc }, "cours rejeté (écart)");
    } catch (err) {
      const raison = err instanceof Error ? err.message : "inconnue";
      log.warn({ source: f.nom, raison }, "fournisseur en échec");
    }
  }
  return null;
}

export function creerServiceTaux(depot: DepotTaux, fournisseurs: Fournisseur[]): ServiceTaux {
  let dernier: Taux | null = versTaux(depot);
  let enVol: Promise<Taux> | null = null;
  let dernierEchec = 0;

  async function rafraichir(log: FastifyBaseLogger): Promise<Taux> {
    const frais = await interroger(fournisseurs, dernier, log);
    if (frais) {
      dernier = frais;
      dernierEchec = 0;
      depot.ecrire(frais);
      return frais;
    }
    dernierEchec = maintenant();
    if (dernier) return { ...dernier, enCache: true };
    throw erreurs.indisponible("Cours indisponible pour le moment.");
  }

  return {
    async obtenir(log) {
      const t = maintenant();
      if (dernier && !dernier.enCache && t - dernier.majLe < DUREE_CACHE_S) return dernier;
      // Après un échec, on attend avant de réinterroger : sinon chaque requête paierait les délais.
      if (dernier && t - dernierEchec < DUREE_CACHE_S) return { ...dernier, enCache: true };
      // Une seule requête sortante à la fois : les appels concurrents partagent la promesse.
      enVol ??= rafraichir(log).finally(() => {
        enVol = null;
      });
      return enVol;
    },
    etat: () => ({ disponible: dernier !== null, majLe: dernier?.majLe ?? null }),
  };
}
