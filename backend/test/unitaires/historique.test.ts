import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import { XOF_PAR_EUR } from "../../src/taux/fournisseurs.js";
import { creerServiceHistorique, versJours } from "../../src/taux/historique.js";
import { appDeTest, historiqueFixe } from "../outils.js";

const log = pino({ level: "silent" });

describe("historique des cours", () => {
  it("un point par jour UTC, cours convertis en FCFA, points invalides écartés", () => {
    const j = versJours([
      [Date.UTC(2026, 10, 17), 60_000],
      [Date.UTC(2026, 10, 18), 61_000],
      [Date.UTC(2026, 10, 18, 12), 62_000],
      [Date.UTC(2026, 10, 19), -1],
    ]);
    expect(j).toEqual([
      { jour: "2026-11-17", fcfaParBtc: Math.round(60_000 * XOF_PAR_EUR) },
      { jour: "2026-11-18", fcfaParBtc: Math.round(62_000 * XOF_PAR_EUR) },
    ]);
  });

  it("cache d'une heure et requête partagée", async () => {
    const source = vi.fn(historiqueFixe);
    const s = creerServiceHistorique(source);
    await Promise.all([s.obtenir(log), s.obtenir(log), s.obtenir(log)]);
    await s.obtenir(log);
    expect(source).toHaveBeenCalledTimes(1);
  });

  it("source en panne sans historique connu → 503", async () => {
    const s = creerServiceHistorique(async () => {
      throw new Error("réseau");
    });
    await expect(s.obtenir(log)).rejects.toMatchObject({ statusCode: 503 });
  });

  it("historique trop court refusé", async () => {
    const s = creerServiceHistorique(async () => [[Date.now(), 60_000]]);
    await expect(s.obtenir(log)).rejects.toMatchObject({ statusCode: 503 });
  });

  it("GET /api/taux/historique : 91 jours, cache public d'une heure", async () => {
    const { app } = await appDeTest();
    const r = await app.inject({ method: "GET", url: "/api/taux/historique" });
    expect(r.statusCode).toBe(200);
    expect(r.json().jours).toHaveLength(91);
    expect(r.headers["cache-control"]).toBe("public, max-age=3600");
    await app.close();
  });
});
