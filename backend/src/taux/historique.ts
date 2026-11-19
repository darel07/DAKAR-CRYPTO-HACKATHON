import type { FastifyBaseLogger } from "fastify";
import { erreurs } from "../erreurs.js";
import { XOF_PAR_EUR } from "./fournisseurs.js";

/** Cours d'un jour (UTC). Sert à la vue prêteur pour contrôler le montant FCFA d'une vente
 *  prouvée : le commerçant signe lui-même son passeport, il ne peut donc pas fournir le cours. */
export interface CoursDuJour {
  jour: string;
  fcfaParBtc: number;
}

export interface Historique {
  jours: CoursDuJour[];
  majLe: number;
  enCache: boolean;
}

/** Renvoie les points [horodatage ms, cours BTC/EUR] des 90 derniers jours. */
export type SourceHistorique = (signal: AbortSignal) => Promise<[number, number][]>;

const DUREE_CACHE_S = 3600;
const DELAI_MS = 6_000;

export const coingeckoHistorique: SourceHistorique = async (signal) => {
  const url =
    "https://api.coingecko.com/api/v3/coins/bitcoin/market_chart?vs_currency=eur&days=90&interval=daily";
  const reponse = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
  const json = (await reponse.json()) as { prices?: unknown };
  if (!Array.isArray(json.prices)) throw new Error("champ prices absent");
  return json.prices.filter(
    (p): p is [number, number] => Array.isArray(p) && typeof p[0] === "number" && typeof p[1] === "number",
  );
};

/** Un point par jour UTC (le dernier reçu l'emporte), cours plausibles uniquement. */
export function versJours(points: [number, number][]): CoursDuJour[] {
  const parJour = new Map<string, number>();
  for (const [ms, eur] of points) {
    if (!Number.isFinite(ms) || !Number.isFinite(eur) || eur <= 0) continue;
    parJour.set(new Date(ms).toISOString().slice(0, 10), Math.round(eur * XOF_PAR_EUR));
  }
  return [...parJour]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([jour, fcfaParBtc]) => ({ jour, fcfaParBtc }));
}

export interface ServiceHistorique {
  obtenir(log: FastifyBaseLogger): Promise<Historique>;
}

/** Cache d'une heure, requête partagée entre appels concurrents, dernier historique connu en
 *  repli. Sans historique du tout : 503, et la vue prêteur se rabat sur le cours actuel. */
export function creerServiceHistorique(source: SourceHistorique): ServiceHistorique {
  let dernier: Historique | null = null;
  let enVol: Promise<Historique> | null = null;
  const maintenant = () => Math.floor(Date.now() / 1000);

  async function rafraichir(log: FastifyBaseLogger): Promise<Historique> {
    try {
      const jours = versJours(await source(AbortSignal.timeout(DELAI_MS)));
      if (jours.length < 30) throw new Error(`historique trop court (${jours.length} jours)`);
      dernier = { jours, majLe: maintenant(), enCache: false };
      return dernier;
    } catch (err) {
      log.warn(
        { raison: err instanceof Error ? err.message : "inconnue" },
        "historique des cours indisponible",
      );
      if (dernier) return { ...dernier, enCache: true };
      throw erreurs.indisponible("Historique des cours indisponible pour le moment.");
    }
  }

  return {
    async obtenir(log) {
      if (dernier && maintenant() - dernier.majLe < DUREE_CACHE_S) return dernier;
      enVol ??= rafraichir(log).finally(() => {
        enVol = null;
      });
      return enVol;
    },
  };
}
