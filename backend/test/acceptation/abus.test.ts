import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import Anthropic from "@anthropic-ai/sdk";
import type { ClientIA } from "../../src/ia/claude.js";
import { appDeTest, chargeSignee } from "../outils.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const analyser = (a: FastifyInstance, texte: unknown) =>
  a.inject({ method: "POST", url: "/api/ia/analyser", payload: { texte } });
const creer = (a: FastifyInstance, charge: string) =>
  a.inject({ method: "POST", url: "/api/passeports", payload: { charge } });

const clientQui = (comportement: () => Promise<never> | Promise<null>): ClientIA => ({
  analyser: comportement,
  resumer: comportement,
});

describe("validation des entrées de l'analyse", () => {
  it.each([
    ["vide", ""],
    ["espaces seuls", "   "],
    ["121 caractères", "a".repeat(121)],
    ["caractère de contrôle", "riz\u0000 5000"],
    ["pas une chaîne", 42],
  ])("%s → 422 VALIDATION_ERROR", async (_nom, texte) => {
    ({ app } = await appDeTest());
    const r = await analyser(app, texte);
    expect(r.statusCode).toBe(422);
    expect(r.json().error.code).toBe("VALIDATION_ERROR");
  });

  it("JSON invalide → 422 avec message français", async () => {
    ({ app } = await appDeTest());
    const r = await app.inject({
      method: "POST",
      url: "/api/ia/analyser",
      headers: { "content-type": "application/json" },
      payload: "{pas du json",
    });
    expect(r.statusCode).toBe(422);
    expect(r.json().error.message).toMatch(/JSON/);
  });
});

describe("mode dégradé de l'IA : jamais de 5xx", () => {
  it("IA désactivée → 200 source regle", async () => {
    ({ app } = await appDeTest({ clientIA: null }));
    const r = await analyser(app, "2 sacs de riz, 15 000");
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ source: "regle", montantFcfa: 15_000, confiance: "basse" });
  });

  it.each([
    ["erreur de connexion", () => Promise.reject(new Anthropic.APIConnectionError({ message: "x" }))],
    ["erreur quelconque", () => Promise.reject(new Error("boum"))],
    ["refus (null)", () => Promise.resolve(null)],
  ])("client IA : %s → 200 regle", async (_nom, comportement) => {
    ({ app } = await appDeTest({ clientIA: clientQui(comportement as () => Promise<never>) }));
    const r = await analyser(app, "huile 6500");
    expect(r.statusCode).toBe(200);
    expect(r.json().source).toBe("regle");
  });

  it("client IA qui dépasse le délai → 200 regle", async () => {
    const lent: ClientIA = {
      analyser: () => new Promise((ok) => setTimeout(() => ok(null), 2_000)),
      resumer: () => new Promise((ok) => setTimeout(() => ok(null), 2_000)),
    };
    ({ app } = await appDeTest({ clientIA: lent, delaiIaMs: 50 }));
    const r = await analyser(app, "huile 6500");
    expect(r.json().source).toBe("regle");
  });

  it("IA disponible → 200 source ia", async () => {
    const bon: ClientIA = {
      analyser: async () => ({
        libelle: "riz",
        quantite: 2,
        montantFcfa: 15_000,
        moyen: null,
        confiance: "haute",
      }),
      resumer: async () => "Aujourd'hui, 14 ventes pour 87 500 FCFA.",
    };
    ({ app } = await appDeTest({ clientIA: bon }));
    expect((await analyser(app, "deux sacs de riz quinze mille")).json()).toMatchObject({ source: "ia" });
  });

  it("résumé IA avec un chiffre inventé → gabarit", async () => {
    const menteur: ClientIA = {
      analyser: async () => null,
      resumer: async () => "Aujourd'hui, 14 ventes pour 99 999 FCFA.",
    };
    ({ app } = await appDeTest({ clientIA: menteur }));
    const r = await app.inject({
      method: "POST",
      url: "/api/ia/resume",
      payload: {
        jour: "2026-11-18",
        totalFcfa: 87_500,
        nbVentes: 14,
        totalProuveFcfa: 32_000,
        meilleureHeure: null,
        articlesFrequents: [],
      },
    });
    expect(r.statusCode).toBe(200);
    expect(r.json()).toMatchObject({ source: "modele" });
    expect(r.json().resume).toContain("87 500");
  });
});

describe("passeports", () => {
  it("création puis lecture", async () => {
    ({ app } = await appDeTest());
    const charge = chargeSignee();
    const c = await creer(app, charge);
    expect(c.statusCode).toBe(201);
    expect(c.json().url).toBe(`http://localhost:8080/#/preteur/p/${c.json().id}`);
    const l = await app.inject({ method: "GET", url: `/api/passeports/${c.json().id}` });
    expect(l.statusCode).toBe(200);
    expect(l.json().charge).toBe(charge);
    expect(l.headers["cache-control"]).toBe("private, max-age=300");
  });

  it("même charge deux fois → même identifiant", async () => {
    ({ app } = await appDeTest());
    const charge = chargeSignee();
    expect((await creer(app, charge)).json().id).toBe((await creer(app, charge)).json().id);
  });

  it("charge de 65 Kio → 413 PAYLOAD_TOO_LARGE", async () => {
    ({ app } = await appDeTest());
    const r = await creer(app, "A".repeat(65 * 1024));
    expect(r.statusCode).toBe(413);
    expect(r.json().error.code).toBe("PAYLOAD_TOO_LARGE");
  });

  it("corps au-delà de 72 Kio → 413", async () => {
    ({ app } = await appDeTest());
    expect((await creer(app, "A".repeat(80 * 1024))).statusCode).toBe(413);
  });

  it("signature altérée → 422", async () => {
    ({ app } = await appDeTest());
    const r = await creer(app, chargeSignee({ alterer: true }));
    expect(r.statusCode).toBe(422);
    expect(r.json().error.message).toBe("Ce passeport n'est pas valide.");
  });

  // Au-delà de 100 caractères, le routeur de Fastify répond 414 avant la route : sans risque.
  it.each(["xyz", "demo00000!", "a".repeat(64)])("identifiant mal formé « %s » → 404", async (id) => {
    ({ app } = await appDeTest());
    const r = await app.inject({ method: "GET", url: `/api/passeports/${id}` });
    expect(r.statusCode).toBe(404);
    expect(r.json().error.code).toBe("NOT_FOUND");
  });

  it("identifiant expiré → 404, puis purgé", async () => {
    let etat;
    ({ app, etat } = await appDeTest());
    const ancien = Math.floor(Date.now() / 1000) - 40 * 86_400;
    etat.depotPasseports.inserer({
      id: "expire0000",
      empreinte: "e".repeat(64),
      charge: "x",
      creeLe: ancien,
      expireLe: ancien + 30 * 86_400,
    });
    expect((await app.inject({ method: "GET", url: "/api/passeports/expire0000" })).statusCode).toBe(404);
    expect(etat.passeports.purger()).toBe(1);
  });
});
