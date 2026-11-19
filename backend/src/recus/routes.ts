import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { SchemaErreur } from "../erreurs.js";
import { LIMITES } from "../securite.js";
import type { ServiceRecus } from "./service.js";
import { SchemaConfirmation } from "./verification.js";

const Charge = z.object({
  charge: z.string({ message: "La charge du reçu est obligatoire." }).min(1, {
    message: "La charge du reçu est obligatoire.",
  }),
});
const ParamId = z.object({ id: z.string() });

const schemaCreation = {
  tags: ["Reçus"],
  summary: "Lien court pour un reçu signé par le commerçant (vérifié avant stockage, 90 jours)",
  body: Charge,
  response: {
    201: z.object({ id: z.string(), url: z.string(), expireLe: z.number().int() }),
    413: SchemaErreur,
    422: SchemaErreur,
    429: SchemaErreur,
  },
};

const schemaLecture = {
  tags: ["Reçus"],
  summary: "Reçu et, s'il existe, la confirmation signée par le client",
  params: ParamId,
  response: {
    200: z.object({
      charge: z.string(),
      expireLe: z.number().int(),
      confirmation: SchemaConfirmation.nullable(),
    }),
    404: SchemaErreur,
  },
};

const schemaConfirmation = {
  tags: ["Reçus"],
  summary: "Le client confirme l'achat par un événement Nostr signé (une seule fois)",
  params: ParamId,
  body: z.object({ evenement: SchemaConfirmation }),
  response: {
    201: z.object({ confirmeLe: z.number().int() }),
    404: SchemaErreur,
    409: SchemaErreur,
    422: SchemaErreur,
    429: SchemaErreur,
  },
};

export const routesRecus =
  (recus: ServiceRecus): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(
      "/api/recus",
      { config: { rateLimit: LIMITES.creationRecu }, schema: schemaCreation },
      async (req, reply) => reply.status(201).send(recus.creer(req.body.charge)),
    );
    app.get(
      "/api/recus/:id",
      { config: { rateLimit: LIMITES.lecturePasseport }, schema: schemaLecture },
      async (req, reply) => {
        reply.header("Cache-Control", "no-store");
        return recus.lire(req.params.id);
      },
    );
    app.post(
      "/api/recus/:id/confirmation",
      { config: { rateLimit: LIMITES.confirmation }, schema: schemaConfirmation },
      async (req, reply) => reply.status(201).send(recus.confirmer(req.params.id, req.body.evenement)),
    );
  };
