import { describe, expect, it, vi } from "vitest";
import pino from "pino";
import { ouvrirBase } from "../../src/base.js";
import { creerDepotTaux } from "../../src/taux/depot.js";
import { XOF_PAR_EUR, type Fournisseur } from "../../src/taux/fournisseurs.js";
import { coursPlausible, creerServiceTaux } from "../../src/taux/service.js";
import { fournisseurFixe } from "../outils.js";

const log = pino({ level: "silent" });
const enPanne = (nom: Fournisseur["nom"]) => fournisseurFixe(nom, new Error("réseau"));

describe("contrôle de qualité du cours", () => {
  const ref = { fcfaParBtc: 40_000_000, majLe: 1_000, source: "coingecko" as const, enCache: false };
  it("rejette un cours nul, négatif ou non fini", () => {
    for (const v of [0, -1, Number.NaN, Number.POSITIVE_INFINITY])
      expect(coursPlausible(v, null)).toBe(false);
  });
  it("rejette un écart de plus de 25 % avec un cours de moins d'une heure", () => {
    expect(coursPlausible(51_000_000, ref, 1_100)).toBe(false);
    expect(coursPlausible(49_000_000, ref, 1_100)).toBe(true);
  });
  it("accepte un grand écart si la référence a plus d'une heure", () => {
    expect(coursPlausible(60_000_000, ref, 1_000 + 3_601)).toBe(true);
  });
});

describe("repli des fournisseurs", () => {
  const nouveau = (f: Fournisseur[]) => {
    const db = ouvrirBase(":memory:");
    return { service: creerServiceTaux(creerDepotTaux(db), f), db };
  };

  it("fournisseur 1 en panne → fournisseur 2", async () => {
    const { service } = nouveau([enPanne("coingecko"), fournisseurFixe("mempool", 60_000)]);
    const t = await service.obtenir(log);
    expect(t).toMatchObject({
      source: "mempool",
      enCache: false,
      fcfaParBtc: Math.round(60_000 * XOF_PAR_EUR),
    });
  });

  it("tous en panne → dernier cours connu, enCache: true", async () => {
    const db = ouvrirBase(":memory:");
    const depot = creerDepotTaux(db);
    depot.ecrire({ fcfaParBtc: 39_000_000, source: "coingecko", majLe: 1_000 });
    const service = creerServiceTaux(depot, [enPanne("coingecko"), enPanne("mempool")]);
    expect(await service.obtenir(log)).toMatchObject({ fcfaParBtc: 39_000_000, enCache: true });
  });

  it("tous en panne et aucun cours connu → 503", async () => {
    const { service } = nouveau([enPanne("coingecko"), enPanne("mempool")]);
    await expect(service.obtenir(log)).rejects.toMatchObject({
      code: "SERVICE_UNAVAILABLE",
      statusCode: 503,
    });
  });

  it("le cours obtenu est persisté et relu au redémarrage", async () => {
    const db = ouvrirBase(":memory:");
    await creerServiceTaux(creerDepotTaux(db), [fournisseurFixe("coingecko", 60_000)]).obtenir(log);
    const redemarre = creerServiceTaux(creerDepotTaux(db), [enPanne("coingecko")]);
    expect(redemarre.etat().disponible).toBe(true);
    expect(await redemarre.obtenir(log)).toMatchObject({ enCache: true, source: "coingecko" });
  });

  it("requêtes concurrentes : une seule requête sortante", async () => {
    const appel = vi.fn(async () => 60_000);
    const { service } = nouveau([{ nom: "coingecko", btcEnEur: appel }]);
    await Promise.all(Array.from({ length: 10 }, () => service.obtenir(log)));
    expect(appel).toHaveBeenCalledTimes(1);
  });

  it("cache de 60 s : pas de nouvel appel immédiat", async () => {
    const appel = vi.fn(async () => 60_000);
    const { service } = nouveau([{ nom: "coingecko", btcEnEur: appel }]);
    await service.obtenir(log);
    await service.obtenir(log);
    expect(appel).toHaveBeenCalledTimes(1);
  });

  it("après un échec, pas de nouvel essai pendant 60 s (pas de délai payé à chaque requête)", async () => {
    const db = ouvrirBase(":memory:");
    const depot = creerDepotTaux(db);
    depot.ecrire({ fcfaParBtc: 39_000_000, source: "coingecko", majLe: 1_000 });
    const appel = vi.fn(async (): Promise<number> => {
      throw new Error("réseau");
    });
    const service = creerServiceTaux(depot, [{ nom: "coingecko", btcEnEur: appel }]);
    await service.obtenir(log);
    await service.obtenir(log);
    expect(appel).toHaveBeenCalledTimes(1);
  });
});
