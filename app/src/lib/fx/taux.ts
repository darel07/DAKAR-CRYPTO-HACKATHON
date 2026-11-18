// Le FCFA (XOF) est arrimé à l'euro à parité fixe : seul le cours BTC/EUR varie.
const XOF_PAR_EUR = 655.957;
const CLE_CACHE = "passeport.taux.v1";
const DELAI_MS = 6000;

export interface Taux {
  /** Combien de FCFA vaut 1 BTC. */
  fcfaParBtc: number;
  /** Secondes Unix de la dernière mise à jour réussie. */
  majLe: number;
  /** Vrai si le réseau a échoué et qu'on utilise la dernière valeur connue. */
  enCache: boolean;
}

function lireCache(): Taux | null {
  try {
    const brut = localStorage.getItem(CLE_CACHE);
    return brut ? { ...(JSON.parse(brut) as Taux), enCache: true } : null;
  } catch {
    return null;
  }
}

/** Récupère le cours ; en cas d'échec, repli sur le cache (exigé : usage hors ligne). */
export async function chargerTaux(signal?: AbortSignal): Promise<Taux | null> {
  const delai = new AbortController();
  const minuteur = setTimeout(() => delai.abort(), DELAI_MS);
  signal?.addEventListener("abort", () => delai.abort());
  try {
    const rep = await fetch(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur",
      { signal: delai.signal },
    );
    if (!rep.ok) throw new Error(`HTTP ${rep.status}`);
    const json = (await rep.json()) as { bitcoin?: { eur?: number } };
    const eur = json.bitcoin?.eur;
    if (!eur || eur <= 0) throw new Error("cours invalide");
    const taux: Taux = { fcfaParBtc: eur * XOF_PAR_EUR, majLe: Math.floor(Date.now() / 1000), enCache: false };
    try { localStorage.setItem(CLE_CACHE, JSON.stringify(taux)); } catch { /* ignoré */ }
    return taux;
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError" && signal?.aborted) throw e;
    return lireCache();
  } finally {
    clearTimeout(minuteur);
  }
}

export function fcfaVersSats(fcfa: number, taux: Taux): number {
  return Math.max(1, Math.round((fcfa / taux.fcfaParBtc) * 1e8));
}
