import { appelerApi } from "../api";

export interface LienPasseport {
  url: string;
  /** Lien court (#/preteur/p/<id>), valable 30 jours ; sinon lien long portant toute la charge. */
  court: boolean;
  /** Secondes Unix, lien court seulement. */
  expireLe: number | null;
}

const DELAI = 8000;
const ID_VALIDE = /^[0-9A-Za-z]{10}$/;

/** Adresse de l'application, quelle que soit l'origine que le backend connaît. */
const base = () => `${window.location.origin}${window.location.pathname}`;

/** POST /api/passeports : le backend vérifie la signature et rend un identifiant court. Sans
 *  backend (ou hors ligne), le lien long marche toujours : la vue prêteur décode la charge. */
export async function lienPasseport(charge: string): Promise<LienPasseport> {
  try {
    if (navigator.onLine === false) throw new Error("hors ligne");
    const r = await appelerApi<{ id?: unknown; expireLe?: unknown }>("/passeports", {
      delai: DELAI,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ charge }) },
    });
    if (typeof r.id !== "string" || !ID_VALIDE.test(r.id)) throw new Error("identifiant invalide");
    return { url: `${base()}#/preteur/p/${r.id}`, court: true, expireLe: typeof r.expireLe === "number" ? r.expireLe : null };
  } catch {
    return { url: `${base()}#/preteur/${charge}`, court: false, expireLe: null };
  }
}
