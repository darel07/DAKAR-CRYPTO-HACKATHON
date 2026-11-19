import { appelerApi } from "../api";
import type { ReferenceCours } from "../nostr/controleMontants";
import { chargerTaux } from "./taux";

const DELAI_MS = 6000;

interface ReponseHistorique {
  jours?: { jour?: unknown; fcfaParBtc?: unknown }[];
}

/** Historique quotidien (backend, mis en cache 1 h côté serveur) → table jour → cours. */
async function depuisHistorique(signal: AbortSignal): Promise<ReferenceCours> {
  const r = await appelerApi<ReponseHistorique>("/taux/historique", { signal, delai: DELAI_MS });
  const parJour = new Map<string, number>();
  for (const j of r.jours ?? []) {
    if (typeof j.jour === "string" && typeof j.fcfaParBtc === "number" && j.fcfaParBtc > 0) {
      parJour.set(j.jour, j.fcfaParBtc);
    }
  }
  if (parJour.size < 30) throw new Error("historique incomplet");
  return { niveau: "jour", parJour };
}

/** Référence du prêteur pour contrôler les montants : historique du jour de chaque vente,
 *  sinon cours actuel (backend, CoinGecko ou cache), sinon simple plage plausible.
 *  Ne rejette jamais : un prêteur hors ligne voit quand même le passeport, avec un contrôle
 *  plus grossier signalé à l'écran. */
export async function chargerReference(signal: AbortSignal): Promise<ReferenceCours> {
  try {
    return await depuisHistorique(signal);
  } catch {
    const taux = await chargerTaux(signal).catch(() => null);
    return taux ? { niveau: "courant", fcfaParBtc: taux.fcfaParBtc } : { niveau: "plage" };
  }
}
