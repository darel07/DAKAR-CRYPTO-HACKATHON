import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { SchemaErreur } from "../erreurs.js";
import type { ServiceTaux } from "./service.js";

export const ReponseTaux = z.object({
  fcfaParBtc: z.number().positive(),
  majLe: z.number().int(),
  source: z.enum(["coingecko", "mempool"]),
  enCache: z.boolean(),
});

export const routesTaux =
  (taux: ServiceTaux): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/api/taux",
      {
        schema: {
          tags: ["Cours"],
          summary: "Cours FCFA pour 1 BTC (cache 60 s, repli sur le dernier cours connu)",
          response: { 200: ReponseTaux, 503: SchemaErreur },
        },
      },
      async (req, reply) => {
        const t = await taux.obtenir(req.log);
        reply.header("Cache-Control", "public, max-age=30");
        return t;
      },
    );
  };
