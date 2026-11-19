import { describe, expect, it } from "vitest";
import { ROUTES_PUBLIQUES, ROUTES_TECHNIQUES } from "../../src/routes-publiques.js";
import { appDeTest } from "../outils.js";

/** Convertit « /api/passeports/{id} » (OpenAPI) en « /api/passeports/:id » (Fastify). */
const versFastify = (chemin: string) => chemin.replace(/\{(\w+)\}/g, ":$1");

describe("contrat d'API", () => {
  it("chaque route montée sous /api est déclarée ET documentée, et inversement", async () => {
    const montees: string[] = [];
    const { app } = await appDeTest({}, (a) =>
      a.addHook("onRoute", (r) => {
        const methodes = Array.isArray(r.method) ? r.method : [r.method];
        for (const m of methodes) if (m !== "HEAD") montees.push(`${m} ${r.url}`);
      }),
    );
    const api = montees.filter((r) => {
      const url = r.split(" ")[1] ?? "";
      return url.startsWith("/api/") && !ROUTES_TECHNIQUES.test(url);
    });

    const doc = (await app.inject({ method: "GET", url: "/api/openapi.json" })).json() as {
      paths: Record<string, Record<string, unknown>>;
    };
    const documentees = Object.entries(doc.paths).flatMap(([chemin, ops]) =>
      Object.keys(ops).map((m) => `${m.toUpperCase()} ${versFastify(chemin)}`),
    );

    expect([...api].sort()).toEqual([...ROUTES_PUBLIQUES].sort());
    expect([...documentees].sort()).toEqual([...ROUTES_PUBLIQUES].sort());
    await app.close();
  });

  it("chaque route documentée décrit sa réponse 200 ou 201", async () => {
    const { app } = await appDeTest();
    const doc = (await app.inject({ method: "GET", url: "/api/openapi.json" })).json() as {
      paths: Record<string, Record<string, { responses: Record<string, unknown> }>>;
    };
    for (const ops of Object.values(doc.paths)) {
      for (const op of Object.values(ops)) {
        expect(Object.keys(op.responses).some((s) => s === "200" || s === "201")).toBe(true);
      }
    }
    await app.close();
  });
});
