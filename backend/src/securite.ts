import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { Config } from "./config.js";
import { erreurs } from "./erreurs.js";

/** Portées de débit séparées : une rafale sur une portée n'épuise pas les autres.
 *  Une limite posée en `config.rateLimit` a son propre compteur par route ; pour qu'analyse
 *  et résumé partagent la portée IA, un seul limiteur est créé (`app.rateLimit`) et posé
 *  sur les deux routes. */
export const LIMITES = {
  generale: { max: 120, timeWindow: "1 minute" },
  ia: { max: 20, timeWindow: "1 minute" },
  creationPasseport: { max: 10, timeWindow: "1 hour" },
  lecturePasseport: { max: 60, timeWindow: "1 minute" },
} as const;

export const CSP = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'"],
  styleSrc: ["'self'", "'unsafe-inline'"],
  imgSrc: ["'self'", "data:", "blob:"],
  // data: : Vite intègre les petits fichiers de police directement dans le CSS.
  fontSrc: ["'self'", "data:"],
  connectSrc: ["'self'", "wss:", "https://api.coingecko.com"],
  workerSrc: ["'self'"],
  manifestSrc: ["'self'"],
  frameAncestors: ["'none'"],
  baseUri: ["'self'"],
  formAction: ["'self'"],
  objectSrc: ["'none'"],
  upgradeInsecureRequests: null,
};

/** Taille de corps maximale acceptée par le serveur (la charge d'un passeport fait ≤ 64 Kio). */
export const CORPS_MAX_OCTETS = 72 * 1024;

const SCRIPT_EN_LIGNE = /<script(?![^>]*\bsrc\s*=)[^>]*>([\s\S]*?)<\/script>/gi;

/** Empreintes CSP des scripts en ligne de l'index.html servi (le script qui applique le thème
 *  avant l'affichage). Seuls ces scripts exacts sont autorisés : un script injecté reste bloqué,
 *  et une modification du front est prise en compte au prochain démarrage. */
export function empreintesScriptsEnLigne(html: string): string[] {
  return [...html.matchAll(SCRIPT_EN_LIGNE)]
    .map((m) => m[1] ?? "")
    .filter((code) => code.trim().length > 0)
    .map((code) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`);
}

function lireIndex(frontDist: string): string {
  const chemin = join(frontDist, "index.html");
  return existsSync(chemin) ? readFileSync(chemin, "utf8") : "";
}

export async function installerSecurite(app: FastifyInstance, config: Config): Promise<void> {
  const scriptSrc = [...CSP.scriptSrc, ...empreintesScriptsEnLigne(lireIndex(config.frontDist))];
  await app.register(helmet, {
    contentSecurityPolicy: { useDefaults: false, directives: { ...CSP, scriptSrc } },
    referrerPolicy: { policy: "no-referrer" },
    crossOriginEmbedderPolicy: false,
  });
  app.addHook("onSend", async (_req, reply) => {
    reply.header("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  });
  await app.register(cors, {
    origin: config.corsOrigins,
    methods: ["GET", "POST"],
    allowedHeaders: ["content-type"],
    credentials: false,
  });
  await app.register(rateLimit, {
    global: true,
    ...LIMITES.generale,
    // Les fichiers du front ne sont pas limités : une page charge des dizaines de fichiers.
    allowList: (req) => !req.url.startsWith("/api"),
    errorResponseBuilder: () => erreurs.debit(),
  });
}
