/** Inventaire déclaré de l'API. Toutes les routes sont publiques par conception (pas de compte) :
 *  la protection repose sur la validation, les tailles maximales et la limitation de débit.
 *  Le test de contrat échoue si une route montée sous /api manque ici ou dans l'OpenAPI. */
export const ROUTES_PUBLIQUES = [
  "GET /api/sante",
  "GET /api/taux",
  "POST /api/ia/analyser",
  "POST /api/ia/resume",
  "POST /api/passeports",
  "GET /api/passeports/:id",
] as const;

/** Routes techniques exclues de l'inventaire métier (documentation elle-même). */
export const ROUTES_TECHNIQUES = /^\/api\/(docs|openapi\.json)/;
