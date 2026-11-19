import { describe, expect, it } from "vitest";
import { libelleControle, montantCoherent, type ReferenceCours } from "../controleMontants";

// 1 BTC = 40 000 000 FCFA : 10 000 sats valent 4 000 FCFA.
const COURS = 40_000_000;
const ts = Date.UTC(2026, 10, 18, 14) / 1000;
const jour: ReferenceCours = { niveau: "jour", parJour: new Map([["2026-11-18", COURS], ["2026-11-19", COURS]]) };

describe("contrôle du montant d'une vente prouvée (#37)", () => {
  it("montant honnête accepté, à chaque niveau", () => {
    expect(montantCoherent(4_000, 10_000, ts, jour)).toBe(true);
    expect(montantCoherent(4_000, 10_000, ts, { niveau: "courant", fcfaParBtc: COURS })).toBe(true);
    expect(montantCoherent(4_000, 10_000, ts, { niveau: "plage" })).toBe(true);
  });

  it("1 sat déclaré 100 000 FCFA : rejeté même sans aucun cours", () => {
    for (const ref of [jour, { niveau: "courant", fcfaParBtc: COURS }, { niveau: "plage" }] as ReferenceCours[]) {
      expect(montantCoherent(100_000, 1, ts, ref)).toBe(false);
    }
  });

  it("au jour près : +9 % accepté, +15 % rejeté", () => {
    expect(montantCoherent(4_360, 10_000, ts, jour)).toBe(true);
    expect(montantCoherent(4_600, 10_000, ts, jour)).toBe(false);
  });

  it("cours courant : tolérance plus large (35 %)", () => {
    const courant: ReferenceCours = { niveau: "courant", fcfaParBtc: COURS };
    expect(montantCoherent(5_200, 10_000, ts, courant)).toBe(true);
    expect(montantCoherent(6_000, 10_000, ts, courant)).toBe(false);
  });

  it("vente hors de l'historique : repli sur la plage plausible", () => {
    const ancienne = Date.UTC(2025, 0, 1) / 1000;
    expect(montantCoherent(4_000, 10_000, ancienne, jour)).toBe(true);
    expect(montantCoherent(400_000, 10_000, ancienne, jour)).toBe(false);
  });

  it("sats ou montant nuls ou négatifs : rejetés", () => {
    expect(montantCoherent(4_000, 0, ts, jour)).toBe(false);
    expect(montantCoherent(0, 10_000, ts, jour)).toBe(false);
  });

  it("le libellé dit la précision du contrôle", () => {
    expect(libelleControle("jour")).toMatch(/jour de la vente/);
    expect(libelleControle("courant")).toMatch(/approximatif/);
    expect(libelleControle("plage")).toMatch(/grossière/);
  });
});
