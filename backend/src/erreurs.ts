import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors } from "fastify-type-provider-zod";
import { z } from "zod";

/** Codes stables : le front branche dessus, ne pas les renommer. */
export type CodeErreur =
  | "VALIDATION_ERROR"
  | "NOT_FOUND"
  | "CONFLICT"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "INTERNAL_ERROR";

export class ErreurApp extends Error {
  constructor(
    readonly code: CodeErreur,
    readonly statusCode: number,
    message: string,
  ) {
    super(message);
    this.name = "ErreurApp";
  }
}

export const erreurs = {
  validation: (m = "La requête est invalide.") => new ErreurApp("VALIDATION_ERROR", 422, m),
  introuvable: (m = "Ressource introuvable.") => new ErreurApp("NOT_FOUND", 404, m),
  conflit: (m: string) => new ErreurApp("CONFLICT", 409, m),
  tropGros: (m = "Le contenu envoyé est trop volumineux.") => new ErreurApp("PAYLOAD_TOO_LARGE", 413, m),
  debit: () => new ErreurApp("RATE_LIMITED", 429, "Trop de requêtes. Réessayez dans un instant."),
  indisponible: (m: string) => new ErreurApp("SERVICE_UNAVAILABLE", 503, m),
};

const MESSAGE_INTERNE = "Une erreur interne est survenue. Réessayez dans un instant.";

/** Schéma de l'enveloppe, réutilisé dans la documentation OpenAPI. */
export const SchemaErreur = z.object({
  error: z.object({ code: z.string(), message: z.string() }),
});

/** Messages par défaut de zod (en anglais) : remplacés par un message générique en français.
 *  Les schémas de requête portent leurs propres messages français, repris tels quels. */
const MESSAGE_ZOD_ANGLAIS = /^(Invalid|Too (big|small)|Expected|Unrecognized|Required)/;

function messageValidation(err: unknown): string {
  if (!hasZodFastifySchemaValidationErrors(err)) return "La requête est invalide.";
  const message = err.validation[0]?.message;
  return message && !MESSAGE_ZOD_ANGLAIS.test(message) ? message : "La requête est invalide.";
}

/** Traduit toute erreur en enveloppe { error: { code, message } }. */
export function traduire(err: FastifyError | ErreurApp | Error): ErreurApp | null {
  if (err instanceof ErreurApp) return err;
  if (hasZodFastifySchemaValidationErrors(err)) return erreurs.validation(messageValidation(err));
  const code = (err as FastifyError).code;
  if (code === "FST_ERR_CTP_BODY_TOO_LARGE") return erreurs.tropGros();
  if (code === "FST_ERR_CTP_INVALID_JSON_BODY" || code === "FST_ERR_CTP_EMPTY_JSON_BODY")
    return erreurs.validation("Le corps de la requête n'est pas un JSON valide.");
  if (code === "FST_ERR_CTP_INVALID_MEDIA_TYPE")
    return erreurs.validation("Le type de contenu doit être application/json.");
  return null;
}

/** Le seul gestionnaire d'erreurs de l'application. */
export function installerGestionnaireErreurs(app: FastifyInstance): void {
  app.setErrorHandler((err: FastifyError, req, reply) => {
    const connue = traduire(err);
    if (connue) {
      return reply.status(connue.statusCode).send({ error: { code: connue.code, message: connue.message } });
    }
    req.log.error({ err }, "erreur interne");
    return reply.status(500).send({ error: { code: "INTERNAL_ERROR", message: MESSAGE_INTERNE } });
  });
}
