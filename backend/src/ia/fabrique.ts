import type { Config } from "../config.js";
import { creerClientClaude, type ClientIA } from "./claude.js";
import { creerClientCompatible } from "./compatibleOpenai.js";

/** Choisit le modèle selon la configuration ; null = IA désactivée (règle locale). */
export function creerClientIA(config: Config): ClientIA | null {
  if (config.iaFournisseur === "compatible-openai") {
    return config.iaCle && config.iaUrlBase && config.iaModele
      ? creerClientCompatible(config.iaUrlBase, config.iaCle, config.iaModele)
      : null;
  }
  return config.anthropicApiKey ? creerClientClaude(config.anthropicApiKey, config.iaModele) : null;
}

/** Libellé pour les journaux et le script d'essai (jamais la clé). */
export const descriptionIA = (config: Config) =>
  config.iaFournisseur === "compatible-openai"
    ? `${config.iaModele} via ${new URL(config.iaUrlBase ?? "http://inconnu").host}`
    : `${config.iaModele} (Anthropic)`;
