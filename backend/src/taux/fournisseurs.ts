/** FCFA (XOF) arrimé à l'euro : 1 EUR = 655,957 XOF, parité fixe. */
export const XOF_PAR_EUR = 655.957;
export const DELAI_FOURNISSEUR_MS = 4_000;

export type NomSource = "coingecko" | "mempool";

export interface Fournisseur {
  nom: NomSource;
  /** Renvoie le cours d'un bitcoin en euros. Lève une erreur en cas d'échec. */
  btcEnEur(signal: AbortSignal): Promise<number>;
}

async function lireJson(url: string, signal: AbortSignal): Promise<unknown> {
  const reponse = await fetch(url, { signal, headers: { accept: "application/json" } });
  if (!reponse.ok) throw new Error(`statut ${reponse.status}`);
  return reponse.json();
}

const nombre = (v: unknown): number => {
  if (typeof v !== "number") throw new Error("champ absent ou non numérique");
  return v;
};

export const coingecko: Fournisseur = {
  nom: "coingecko",
  async btcEnEur(signal) {
    const json = await lireJson(
      "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur",
      signal,
    );
    return nombre((json as { bitcoin?: { eur?: unknown } }).bitcoin?.eur);
  },
};

export const mempool: Fournisseur = {
  nom: "mempool",
  async btcEnEur(signal) {
    const json = await lireJson("https://mempool.space/api/v1/prices", signal);
    return nombre((json as { EUR?: unknown }).EUR);
  },
};

export const FOURNISSEURS_PAR_DEFAUT: Fournisseur[] = [coingecko, mempool];
