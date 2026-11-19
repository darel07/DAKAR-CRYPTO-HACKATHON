import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyInstance, type FastifyServerOptions } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { randomUUID } from "node:crypto";
import { installerGestionnaireErreurs } from "./erreurs.js";
import type { Etat } from "./etat.js";
import { routesIA } from "./ia/routes.js";
import { optionsJournal } from "./journal.js";
import { routesPasseports } from "./passeports/routes.js";
import { routesRecus } from "./recus/routes.js";
import { routesSante, VERSION } from "./sante/routes.js";
import { CORPS_MAX_OCTETS, installerSecurite } from "./securite.js";
import { installerStatique } from "./statique/routes.js";
import { routesTaux } from "./taux/routes.js";

export interface OptionsApp {
  /** Flux de journal (les tests capturent les journaux pour vérifier qu'ils ne fuient rien). */
  fluxJournal?: NodeJS.WritableStream;
  /** Appelé avant l'enregistrement des routes (le test de contrat y pose un hook onRoute). */
  avantRoutes?: (app: FastifyInstance) => void;
}

async function installerDocumentation(app: FastifyInstance): Promise<void> {
  await app.register(swagger, {
    openapi: {
      info: { title: "API Caisse Lightning", version: VERSION, description: "API sans compte ni secret." },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/api/docs" });
  app.get("/api/openapi.json", { schema: { hide: true } }, async () => app.swagger());
}

/** Construit l'application complète (utilisée par main.ts et par les tests via inject()). */
export async function construireApp(etat: Etat, options: OptionsApp = {}): Promise<FastifyInstance> {
  const opts: FastifyServerOptions = {
    logger: optionsJournal(etat.config.logLevel, options.fluxJournal),
    bodyLimit: CORPS_MAX_OCTETS,
    trustProxy: etat.config.trustProxy,
    genReqId: () => randomUUID(),
  };
  const app = Fastify(opts).withTypeProvider<ZodTypeProvider>();
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  installerGestionnaireErreurs(app);
  options.avantRoutes?.(app);
  app.addHook("onSend", async (req, reply) => {
    reply.header("x-request-id", req.id);
  });

  await installerSecurite(app, etat.config);
  await installerDocumentation(app);
  await app.register(routesSante(etat.ia.active, etat.taux));
  await app.register(routesTaux(etat.taux));
  await app.register(routesIA(etat.ia));
  await app.register(routesPasseports(etat.passeports));
  await app.register(routesRecus(etat.recus));
  await installerStatique(app, etat.config.frontDist);
  return app;
}
