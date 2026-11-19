import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { SchemaErreur } from "../erreurs.js";
import type { ServiceHistorique } from "./historique.js";
import type { ServiceTaux } from "./service.js";

export const ReponseTaux = z.object({
  fcfaParBtc: z.number().positive(),
  majLe: z.number().int(),
  source: z.enum(["coingecko", "mempool"]),
  enCache: z.boolean(),
});

const ReponseHistorique = z.object({
  jours: z.array(z.object({ jour: z.string(), fcfaParBtc: z.number().positive() })),
  majLe: z.number().int(),
  enCache: z.boolean(),
});

const schemaTaux = {
  tags: ["Cours"],
  summary: "Cours FCFA pour 1 BTC (cache 60 s, repli sur le dernier cours connu)",
  response: { 200: ReponseTaux, 503: SchemaErreur },
};

const schemaHistorique = {
  tags: ["Cours"],
  summary: "Cours FCFA pour 1 BTC de chacun des 90 derniers jours (UTC), pour la vue prêteur",
  response: { 200: ReponseHistorique, 503: SchemaErreur },
};

export const routesTaux =
  (taux: ServiceTaux, historique: ServiceHistorique): FastifyPluginAsyncZod =>
  async (app) => {
    app.get("/api/taux", { schema: schemaTaux }, async (req, reply) => {
      const t = await taux.obtenir(req.log);
      reply.header("Cache-Control", "public, max-age=30");
      return t;
    });

    app.get("/api/taux/historique", { schema: schemaHistorique }, async (req, reply) => {
      const h = await historique.obtenir(req.log);
      reply.header("Cache-Control", "public, max-age=3600");
      return h;
    });
  };
