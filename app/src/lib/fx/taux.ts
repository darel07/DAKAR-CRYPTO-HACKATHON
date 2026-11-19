import { appelerApi } from "../api";
import { signalerEchecReseau, signalerSuccesReseau } from "../useReseau";

// Le FCFA (XOF) est arrimé à l'euro à parité fixe : seul le cours BTC/EUR varie.
const XOF_PAR_EUR = 655.957;
const CLE_CACHE = "passeport.taux.v1";
const DELAI_BACKEND_MS = 4000;
const DELAI_MS = 6000;

export interface Taux {
  /** Combien de FCFA vaut 1 BTC. */
  fcfaParBtc: number;
  /** Secondes Unix de la dernière mise à jour réussie. */
  majLe: number;
  /** Vrai si le réseau a échoué et qu'on utilise la dernière valeur connue. */
  enCache: boolean;
}

const valide = (t: Partial<Taux> | null | undefined): t is Taux =>
  !!t && typeof t.fcfaParBtc === "number" && Number.isFinite(t.fcfaParBtc) && t.fcfaParBtc > 0
  && typeof t.majLe === "number" && Number.isFinite(t.majLe);

/** Dernier cours connu sur ce téléphone, lu sans réseau (affiché dès la première image). */
export function lireCache(): Taux | null {
  try {
    const brut = localStorage.getItem(CLE_CACHE);
    const t = brut ? (JSON.parse(brut) as Partial<Taux>) : null;
    return valide(t) ? { fcfaParBtc: t.fcfaParBtc, majLe: t.majLe, enCache: true } : null;
  } catch {
    return null;
  }
}

function enregistrer(t: Taux): void {
  try { localStorage.setItem(CLE_CACHE, JSON.stringify(t)); } catch { /* ignoré */ }
}

/** 1. Backend (cours contrôlé et mis en cache côté serveur). */
async function depuisBackend(signal?: AbortSignal): Promise<Taux> {
  const t = await appelerApi<Partial<Taux>>("/taux", { signal, delai: DELAI_BACKEND_MS });
  if (!valide(t)) throw new Error("cours invalide");
  return { fcfaParBtc: t.fcfaParBtc, majLe: t.majLe, enCache: t.enCache === true };
}

/** 2. CoinGecko en direct, si le backend ne répond pas. */
async function depuisCoinGecko(signal?: AbortSignal): Promise<Taux> {
  const delai = new AbortController();
  const minuteur = setTimeout(() => delai.abort(), DELAI_MS);
  const relayer = () => delai.abort();
  signal?.addEventListener("abort", relayer);
  try {
    const rep = await fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur", { signal: delai.signal });
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    const json = (await rep.json()) as { bitcoin?: { eur?: number } };
    const eur = json.bitcoin?.eur;
    if (!eur || eur <= 0) throw new Error("cours invalide");
    return { fcfaParBtc: eur * XOF_PAR_EUR, majLe: Math.floor(Date.now() / 1000), enCache: false };
  } finally {
    clearTimeout(minuteur);
    signal?.removeEventListener("abort", relayer);
  }
}

/** Récupère le cours : backend, puis CoinGecko, puis cache local (exigé : usage hors ligne). */
export async function chargerTaux(signal?: AbortSignal): Promise<Taux | null> {
  for (const source of [depuisBackend, depuisCoinGecko]) {
    try {
      const taux = await source(signal);
      // Un cours servi par le cache du backend reste un cours « en cache » pour le commerçant.
      if (!taux.enCache) enregistrer(taux);
      signalerSuccesReseau();
      return taux;
    } catch {
      if (signal?.aborted) throw new DOMException("annulé", "AbortError");
      // sinon : source suivante
    }
  }
  signalerEchecReseau();
  return lireCache();
}

export function fcfaVersSats(fcfa: number, taux: Taux): number {
  return Math.max(1, Math.round((fcfa / taux.fcfaParBtc) * 1e8));
}
