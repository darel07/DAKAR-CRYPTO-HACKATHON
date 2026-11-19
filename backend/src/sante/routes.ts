import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import type { ServiceTaux } from "../taux/service.js";

export const VERSION = "0.1.0";

const ReponseSante = z.object({
  statut: z.literal("ok"),
  version: z.string(),
  ia: z.enum(["active", "desactivee"]),
  taux: z.object({ disponible: z.boolean(), majLe: z.number().int().nullable() }),
});

/** Lit uniquement l'état en mémoire : ne touche aucun service externe (healthcheck Docker). */
export const routesSante =
  (iaActive: boolean, taux: ServiceTaux): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      "/api/sante",
      {
        schema: { tags: ["Santé"], summary: "État du service", response: { 200: ReponseSante } },
      },
      async () => ({
        statut: "ok" as const,
        version: VERSION,
        ia: iaActive ? ("active" as const) : ("desactivee" as const),
        taux: taux.etat(),
      }),
    );
  };
