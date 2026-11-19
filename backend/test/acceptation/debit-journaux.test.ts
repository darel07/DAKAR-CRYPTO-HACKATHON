import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import type { ClientIA } from "../../src/ia/claude.js";
import { appDeTest, chargeSignee } from "../outils.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

describe("limitation de débit par portée", () => {
  it("11e création de passeport dans l'heure → 429 avec Retry-After", async () => {
    ({ app } = await appDeTest());
    for (let i = 0; i < 10; i++) {
      const r = await app.inject({
        method: "POST",
        url: "/api/passeports",
        payload: { charge: chargeSignee() },
      });
      expect(r.statusCode).toBe(201);
    }
    const r = await app.inject({
      method: "POST",
      url: "/api/passeports",
      payload: { charge: chargeSignee() },
    });
    expect(r.statusCode).toBe(429);
    expect(r.json().error.code).toBe("RATE_LIMITED");
    expect(Number(r.headers["retry-after"])).toBeGreaterThan(0);
  });

  it("21e requête IA dans la minute → 429 ; analyse et résumé partagent la portée", async () => {
    ({ app } = await appDeTest());
    for (let i = 0; i < 20; i++) {
      await app.inject({ method: "POST", url: "/api/ia/analyser", payload: { texte: `riz ${i + 1}000` } });
    }
    const r = await app.inject({
      method: "POST",
      url: "/api/ia/resume",
      payload: {
        jour: "2026-11-18",
        totalFcfa: 1,
        nbVentes: 1,
        totalProuveFcfa: 0,
        meilleureHeure: null,
        articlesFrequents: [],
      },
    });
    expect(r.statusCode).toBe(429);
  });

  it("une rafale sur /api/passeports/:id ne consomme pas le quota IA", async () => {
    ({ app } = await appDeTest());
    for (let i = 0; i < 60; i++) await app.inject({ method: "GET", url: "/api/passeports/demo000000" });
    const r = await app.inject({ method: "POST", url: "/api/ia/analyser", payload: { texte: "riz 5000" } });
    expect(r.statusCode).toBe(200);
  });

  it("61e lecture de passeport dans la minute → 429", async () => {
    ({ app } = await appDeTest());
    for (let i = 0; i < 60; i++) await app.inject({ method: "GET", url: "/api/passeports/demo000000" });
    expect((await app.inject({ method: "GET", url: "/api/passeports/demo000000" })).statusCode).toBe(429);
  });
});

describe("aucune fuite dans les réponses ni dans les journaux", () => {
  it("une erreur interne → 500 générique, sans pile ni message interne", async () => {
    const casse: ClientIA = { analyser: async () => null, resumer: async () => null };
    let etat;
    ({ app, etat } = await appDeTest({ clientIA: casse }));
    etat.db.close(); // la base fermée fait échouer la création de passeport
    const r = await app.inject({
      method: "POST",
      url: "/api/passeports",
      payload: { charge: chargeSignee() },
    });
    expect(r.statusCode).toBe(500);
    expect(r.json()).toEqual({
      error: {
        code: "INTERNAL_ERROR",
        message: "Une erreur interne est survenue. Réessayez dans un instant.",
      },
    });
    expect(r.body).not.toMatch(/database|sqlite|at \w+ \(|\.ts:/i);
  });

  it("les journaux ne contiennent ni le texte envoyé à l'IA, ni la charge, ni l'IP complète", async () => {
    const enPanne: ClientIA = {
      analyser: async () => {
        throw new Error("panne");
      },
      resumer: async () => null,
    };
    let journaux: () => string;
    ({ app, journaux } = await appDeTest({ clientIA: enPanne }));
    const secret = "tomates-secretes 4321";
    await app.inject({ method: "POST", url: "/api/ia/analyser", payload: { texte: secret } });
    const charge = chargeSignee();
    await app.inject({ method: "POST", url: "/api/passeports", payload: { charge } });
    await app.inject({
      method: "POST",
      url: "/api/passeports",
      payload: { charge: chargeSignee({ alterer: true }) },
    });
    const tout = journaux();
    expect(tout.length).toBeGreaterThan(0);
    expect(tout).toContain("repli local");
    expect(tout).not.toContain("tomates-secretes");
    expect(tout).not.toContain(charge.slice(0, 40));
    expect(tout).not.toContain("127.0.0.1");
  });

  it("chaque réponse porte un x-request-id et les en-têtes de sécurité", async () => {
    ({ app } = await appDeTest());
    const r = await app.inject({ method: "GET", url: "/api/sante" });
    expect(r.headers["x-request-id"]).toMatch(/^[0-9a-f-]{36}$/);
    expect(r.headers["referrer-policy"]).toBe("no-referrer");
    expect(r.headers["x-content-type-options"]).toBe("nosniff");
    expect(r.headers["permissions-policy"]).toBe("camera=(), microphone=(), geolocation=()");
    expect(r.headers["content-security-policy"]).toContain(
      "connect-src 'self' wss: https://api.coingecko.com",
    );
  });

  it("/api/sante ne révèle pas la clé d'API", async () => {
    ({ app } = await appDeTest({ clientIA: { analyser: async () => null, resumer: async () => null } }));
    const r = await app.inject({ method: "GET", url: "/api/sante" });
    expect(r.json()).toMatchObject({ statut: "ok", ia: "active" });
    expect(r.body).not.toMatch(/sk-ant|apiKey/i);
  });

  it("CORS : origine inconnue refusée, origine déclarée acceptée", async () => {
    ({ app } = await appDeTest());
    const inconnue = await app.inject({
      method: "GET",
      url: "/api/sante",
      headers: { origin: "https://pirate.example" },
    });
    expect(inconnue.headers["access-control-allow-origin"]).toBeUndefined();
    const connue = await app.inject({
      method: "GET",
      url: "/api/sante",
      headers: { origin: "http://localhost:5173" },
    });
    expect(connue.headers["access-control-allow-origin"]).toBe("http://localhost:5173");
  });

  it("route /api inconnue → 404 dans l'enveloppe", async () => {
    ({ app } = await appDeTest());
    const r = await app.inject({ method: "GET", url: "/api/inexistante" });
    expect(r.statusCode).toBe(404);
    expect(r.json().error.code).toBe("NOT_FOUND");
  });
});
