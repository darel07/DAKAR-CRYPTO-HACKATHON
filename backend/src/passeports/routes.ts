import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";
import { SchemaErreur } from "../erreurs.js";
import { LIMITES } from "../securite.js";
import type { ServicePasseports } from "./service.js";

// La limite stricte (64 Kio, 413) est appliquée par le service ; le corps est déjà plafonné
// à 72 Kio par le serveur, ce qui laisse une charge un peu trop grosse recevoir le bon code.
const CorpsCreation = z.object({
  charge: z.string({ message: "La charge du passeport est obligatoire." }).min(1, {
    message: "La charge du passeport est obligatoire.",
  }),
});

const schemaCreation = {
  tags: ["Passeports"],
  summary: "Raccourcit un passeport signé (vérifié avant stockage, 30 jours)",
  body: CorpsCreation,
  response: {
    201: z.object({ id: z.string(), url: z.string(), expireLe: z.number().int() }),
    413: SchemaErreur,
    422: SchemaErreur,
    429: SchemaErreur,
  },
};

const schemaLecture = {
  tags: ["Passeports"],
  summary: "Charge d'un passeport raccourci",
  // Pas de motif ici : un identifiant mal formé doit donner 404, pas 422.
  params: z.object({ id: z.string() }),
  response: { 200: z.object({ charge: z.string(), expireLe: z.number().int() }), 404: SchemaErreur },
};

export const routesPasseports =
  (passeports: ServicePasseports): FastifyPluginAsyncZod =>
  async (app) => {
    app.post(
      "/api/passeports",
      { config: { rateLimit: LIMITES.creationPasseport }, schema: schemaCreation },
      async (req, reply) => reply.status(201).send(passeports.creer(req.body.charge)),
    );

    app.get(
      "/api/passeports/:id",
      { config: { rateLimit: LIMITES.lecturePasseport }, schema: schemaLecture },
      async (req, reply) => {
        const p = passeports.lire(req.params.id);
        reply.header("Cache-Control", "private, max-age=300");
        return p;
      },
    );
  };
