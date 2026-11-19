// Appels au backend (branche back). Même origine en production ; en dev, Vite
// redirige /api vers le port 8080 (vite.config.ts). Le backend peut être éteint :
// chaque appelant a un repli local, ce module ne fait que lever une erreur claire.

const BASE = import.meta.env.VITE_API_BASE ?? "/api";

export class ErreurApi extends Error {
  constructor(message: string, readonly statut?: number) { super(message); }
}

/** Rejette si la promesse n'aboutit pas à temps (portefeuille ou réseau muet). */
export function avecDelai<T>(promesse: Promise<T>, ms: number, message = "délai dépassé"): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const minuteur = setTimeout(() => reject(new ErreurApi(message)), ms);
    promesse.then(
      (v) => { clearTimeout(minuteur); resolve(v); },
      (e: unknown) => { clearTimeout(minuteur); reject(e); },
    );
  });
}

interface OptionsApi {
  signal?: AbortSignal;
  /** Délai maximal en ms. */
  delai: number;
  init?: RequestInit;
}

/** GET/POST JSON vers le backend. Lève ErreurApi si le serveur ne répond pas en JSON valide à temps. */
export async function appelerApi<T>(chemin: string, { signal, delai, init }: OptionsApi): Promise<T> {
  const ctrl = new AbortController();
  const minuteur = setTimeout(() => ctrl.abort(), delai);
  const relayer = () => ctrl.abort();
  signal?.addEventListener("abort", relayer);
  try {
    const rep = await fetch(`${BASE}${chemin}`, { ...init, signal: ctrl.signal, headers: { Accept: "application/json", ...init?.headers } });
    // Sans backend, le serveur de dev renvoie la page HTML : ce n'est pas une réponse de l'API.
    if (!rep.ok || !rep.headers.get("content-type")?.includes("application/json")) {
      throw new ErreurApi(`réponse inattendue (${rep.status})`, rep.status);
    }
    return (await rep.json()) as T;
  } catch (e) {
    if (signal?.aborted) throw new DOMException("annulé", "AbortError");
    throw e instanceof ErreurApi ? e : new ErreurApi("backend injoignable");
  } finally {
    clearTimeout(minuteur);
    signal?.removeEventListener("abort", relayer);
  }
}
