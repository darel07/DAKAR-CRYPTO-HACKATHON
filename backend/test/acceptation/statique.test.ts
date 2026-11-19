import { mkdtempSync, writeFileSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { brotliCompressSync, brotliDecompressSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { construireApp } from "../../src/app.js";
import { ouvrirBase } from "../../src/base.js";
import { lireConfig } from "../../src/config.js";
import { creerEtat } from "../../src/etat.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

/** Front compilé minimal, avec la version Brotli produite au build. */
async function appAvecFront() {
  const dist = mkdtempSync(join(tmpdir(), "front-"));
  mkdirSync(join(dist, "assets"));
  const js = "console.log('caisse');".repeat(200);
  writeFileSync(join(dist, "index.html"), "<!doctype html><html><body>caisse</body></html>");
  writeFileSync(join(dist, "assets", "index-abc.js"), js);
  writeFileSync(join(dist, "assets", "index-abc.js.br"), brotliCompressSync(js));
  const config = lireConfig({ DATABASE_PATH: ":memory:", FRONT_DIST: dist });
  const a = await construireApp(creerEtat(config, ouvrirBase(":memory:"), { clientIA: null }));
  await a.ready();
  return { a, js };
}

describe("fichiers du front", () => {
  it("sert la version Brotli pré-compressée quand le navigateur l'accepte", async () => {
    const { a, js } = await appAvecFront();
    app = a;
    const r = await a.inject({
      method: "GET",
      url: "/assets/index-abc.js",
      headers: { "accept-encoding": "br, gzip" },
    });
    expect(r.statusCode).toBe(200);
    expect(r.headers["content-encoding"]).toBe("br");
    expect(r.headers["cache-control"]).toBe("public, max-age=31536000, immutable");
    expect(brotliDecompressSync(r.rawPayload).toString()).toBe(js);
  });

  it("sans Accept-Encoding : fichier en clair", async () => {
    const { a, js } = await appAvecFront();
    app = a;
    const r = await a.inject({
      method: "GET",
      url: "/assets/index-abc.js",
      headers: { "accept-encoding": "identity" },
    });
    expect(r.headers["content-encoding"]).toBeUndefined();
    expect(r.body).toBe(js);
  });

  it("route du front inconnue → index.html (repli SPA), route /api inconnue → 404 JSON", async () => {
    const { a } = await appAvecFront();
    app = a;
    expect((await a.inject({ method: "GET", url: "/preteur/xyz" })).body).toContain("caisse");
    expect((await a.inject({ method: "GET", url: "/api/rien" })).json().error.code).toBe("NOT_FOUND");
  });
});
