import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { SchemaErreur } from "../erreurs.js";
import { LIMITES } from "../securite.js";
import { CorpsAnalyse, CorpsResume, ReponseAnalyse, ReponseResume } from "./schemas.js";
import type { ServiceIA } from "./service.js";

const schemaAnalyse = {
  tags: ["IA"],
  summary: "Propose une vente structurée à partir d'une phrase (confirmation exigée côté front)",
  body: CorpsAnalyse,
  response: { 200: ReponseAnalyse, 422: SchemaErreur, 429: SchemaErreur },
};

const schemaResume = {
  tags: ["IA"],
  summary: "Résumé du jour en français simple, à partir de chiffres agrégés",
  body: CorpsResume,
  response: { 200: ReponseResume, 422: SchemaErreur, 429: SchemaErreur },
};

export const routesIA =
  (ia: ServiceIA): FastifyPluginAsyncZod =>
  async (app) => {
    // Un seul limiteur, donc un seul compteur pour les deux routes ; la limite générale
    // est désactivée sur ces routes pour ne pas compter deux fois.
    const debit = { config: { rateLimit: false as const }, onRequest: app.rateLimit(LIMITES.ia) };

    app.post("/api/ia/analyser", { ...debit, schema: schemaAnalyse }, async (req) =>
      ia.analyser(req.body.texte, req.log),
    );
    app.post("/api/ia/resume", { ...debit, schema: schemaResume }, async (req) =>
      ia.resumer(req.body, req.log),
    );
  };
