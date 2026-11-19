import fastifyStatic from "@fastify/static";
import type { FastifyInstance, FastifyReply } from "fastify";
import { existsSync } from "node:fs";
import { basename, join, resolve, sep } from "node:path";
import { erreurs } from "../erreurs.js";

const SANS_CACHE = new Set(["index.html", "sw.js", "manifest.webmanifest"]);

function entetes(reply: FastifyReply, chemin: string): void {
  const nom = basename(chemin);
  if (SANS_CACHE.has(nom)) reply.header("Cache-Control", "no-cache");
  else if (chemin.includes(`${sep}assets${sep}`))
    reply.header("Cache-Control", "public, max-age=31536000, immutable");
  else reply.header("Cache-Control", "public, max-age=3600");
  if (nom.endsWith(".webmanifest")) reply.header("Content-Type", "application/manifest+json");
}

/** Sert le front compilé, avec repli SPA vers index.html pour toute route hors /api.
 *  Si le dossier n'existe pas (développement du back seul), seule l'API répond. */
export async function installerStatique(app: FastifyInstance, dossier: string): Promise<boolean> {
  const racine = resolve(dossier);
  const present = existsSync(join(racine, "index.html"));
  if (present) {
    await app.register(fastifyStatic, { root: racine, wildcard: true, index: false, setHeaders: entetes });
    app.get("/", { schema: { hide: true } }, (_req, reply) => reply.sendFile("index.html"));
  }
  app.setNotFoundHandler((req, reply) => {
    const api = req.url === "/api" || req.url.startsWith("/api/");
    if (api || !present || req.method !== "GET") {
      const e = erreurs.introuvable();
      return reply.status(e.statusCode).send({ error: { code: e.code, message: e.message } });
    }
    return reply.sendFile("index.html");
  });
  return present;
}
