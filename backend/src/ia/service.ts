import type { FastifyBaseLogger } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import type { ClientIA } from "./claude.js";
import { rendreCoherent } from "./coherence.js";
import { analyserParRegle } from "./regle.js";
import { resumeAcceptable, resumeParGabarit } from "./resume.js";
import type { CorpsResume, ReponseAnalyse, ReponseResume } from "./schemas.js";

/** Au-delà, on n'attend plus le modèle : le commerçant est devant son client. */
export const DELAI_IA_MS = 8_000;

class DelaiDepasse extends Error {}

function avecDelai<T>(promesse: Promise<T>, ms: number): Promise<T> {
  let minuteur: NodeJS.Timeout | undefined;
  const delai = new Promise<never>((_, rejeter) => {
    minuteur = setTimeout(() => rejeter(new DelaiDepasse()), ms);
  });
  return Promise.race([promesse, delai]).finally(() => clearTimeout(minuteur));
}

/** Journalise la panne sans jamais inclure le texte du commerçant. */
function noterPanne(log: FastifyBaseLogger, operation: string, err: unknown): void {
  const genre =
    err instanceof DelaiDepasse
      ? "delai"
      : err instanceof Anthropic.RateLimitError
        ? "limite"
        : err instanceof Anthropic.APIConnectionError
          ? "connexion"
          : err instanceof Anthropic.APIError
            ? `api_${err.status ?? "inconnu"}`
            : "sortie_invalide";
  log.warn({ operation, genre }, "IA indisponible, repli local");
}

export interface ServiceIA {
  readonly active: boolean;
  analyser(texte: string, log: FastifyBaseLogger): Promise<ReponseAnalyse>;
  resumer(chiffres: CorpsResume, log: FastifyBaseLogger): Promise<ReponseResume>;
}

/** Aucune panne du modèle ne remonte au client : on bascule sur la règle locale. */
export function creerServiceIA(client: ClientIA | null, delaiMs = DELAI_IA_MS): ServiceIA {
  return {
    active: client !== null,
    async analyser(texte, log) {
      if (client) {
        try {
          const vente = await avecDelai(client.analyser(texte), delaiMs);
          if (vente) return { ...rendreCoherent(texte, vente), source: "ia" };
          log.warn({ operation: "analyser", genre: "refus_ou_vide" }, "IA sans réponse, repli local");
        } catch (err) {
          noterPanne(log, "analyser", err);
        }
      }
      return { ...analyserParRegle(texte), source: "regle" };
    },
    async resumer(chiffres, log) {
      if (client) {
        try {
          const texte = await avecDelai(client.resumer(chiffres), delaiMs);
          if (texte && resumeAcceptable(texte, chiffres)) return { resume: texte, source: "ia" };
          log.warn({ operation: "resumer", genre: "refus_ou_rejet" }, "résumé IA écarté, gabarit");
        } catch (err) {
          noterPanne(log, "resumer", err);
        }
      }
      return { resume: resumeParGabarit(chiffres), source: "modele" };
    },
  };
}
