import { appelerApi } from "../api";
import type { MoyenVente } from "../domain/types";
import { analyserVenteLocale } from "./analyserVente";

export type Confiance = "haute" | "moyenne" | "basse";

/** Proposition à faire confirmer : jamais enregistrée telle quelle (erreur d'argent possible). */
export interface PropositionVente {
  libelle: string;
  /** null : aucun montant trouvé dans le texte. */
  montantFcfa: number | null;
  /** null : l'écran garde le moyen déjà choisi. */
  moyen: MoyenVente | null;
  confiance: Confiance;
  /** Faux quand la proposition vient du repli local (« Analyse hors ligne »). */
  parIa: boolean;
}

interface ReponseAnalyse {
  libelle?: unknown;
  montantFcfa?: unknown;
  moyen?: unknown;
  confiance?: unknown;
  source?: unknown;
}

/** Délai du contrat (§2 bis.4) : au-delà, le commerçant attend trop pour une saisie de caisse. */
const DELAI_MS = 9000;
const CONFIANCES: readonly Confiance[] = ["haute", "moyenne", "basse"];

/** Le segment de l'écran n'a que trois choix : Orange Money et les moyens inconnus vont dans « Autre ». */
function versMoyen(moyen: unknown): MoyenVente | null {
  if (moyen === "especes" || moyen === "wave" || moyen === "autre") return moyen;
  if (moyen === "orange_money") return "autre";
  return null;
}

function analyseLocale(texte: string): PropositionVente {
  const r = analyserVenteLocale(texte);
  return { libelle: r?.libelle ?? texte.trim(), montantFcfa: r?.montantFcfa ?? null, moyen: null, confiance: "moyenne", parIa: false };
}

/** POST /api/ia/analyser (Claude côté serveur). Repli sur l'analyse locale si le serveur ne répond
 *  pas, refuse (422, 429) ou n'a pas pu utiliser l'IA (`source !== "ia"`) : le commerçant a
 *  toujours une proposition. Le texte n'est envoyé que pour l'analyse, jamais conservé ici. */
export async function analyserVente(texte: string, signal: AbortSignal): Promise<PropositionVente> {
  if (navigator.onLine === false) return analyseLocale(texte);
  let r: ReponseAnalyse;
  try {
    r = await appelerApi<ReponseAnalyse>("/ia/analyser", {
      delai: DELAI_MS,
      signal,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texte: texte.trim() }) },
    });
  } catch (e) {
    if (e instanceof DOMException && e.name === "AbortError") throw e; // annulation : pas un échec
    return analyseLocale(texte);
  }
  if (r.source !== "ia") return analyseLocale(texte);
  const montant = typeof r.montantFcfa === "number" && Number.isInteger(r.montantFcfa) && r.montantFcfa > 0 ? r.montantFcfa : null;
  return {
    libelle: typeof r.libelle === "string" && r.libelle.trim() ? r.libelle.trim().slice(0, 80) : texte.trim(),
    montantFcfa: montant,
    moyen: versMoyen(r.moyen),
    confiance: CONFIANCES.includes(r.confiance as Confiance) ? (r.confiance as Confiance) : "basse",
    parIa: true,
  };
}
