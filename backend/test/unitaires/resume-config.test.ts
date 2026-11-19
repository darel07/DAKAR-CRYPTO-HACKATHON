import { describe, expect, it } from "vitest";
import { lireConfig } from "../../src/config.js";
import { tronquerIp } from "../../src/journal.js";
import { resumeAcceptable, resumeParGabarit } from "../../src/ia/resume.js";
import type { CorpsResume } from "../../src/ia/schemas.js";

const chiffres: CorpsResume = {
  jour: "2026-11-18",
  totalFcfa: 87_500,
  nbVentes: 14,
  totalProuveFcfa: 32_000,
  meilleureHeure: "11h-12h",
  articlesFrequents: ["riz", "huile"],
};

describe("résumé du jour", () => {
  it("gabarit : chiffres exacts", () => {
    expect(resumeParGabarit(chiffres)).toBe(
      "Aujourd'hui, 14 ventes pour 87 500 FCFA, dont 32 000 FCFA prouvés. Votre meilleure heure : 11h-12h. Article le plus vendu : riz.",
    );
  });
  it("gabarit : journée vide", () => {
    expect(resumeParGabarit({ ...chiffres, nbVentes: 0, totalFcfa: 0, totalProuveFcfa: 0 })).toBe(
      "Aucune vente enregistrée aujourd'hui.",
    );
  });
  it("accepte un résumé fidèle aux chiffres", () => {
    expect(
      resumeAcceptable("Aujourd'hui, 14 ventes pour 87 500 FCFA, dont 32 000 FCFA prouvés.", chiffres),
    ).toBe(true);
  });
  it("refuse un chiffre inventé", () => {
    expect(resumeAcceptable("Aujourd'hui, 14 ventes pour 90 000 FCFA.", chiffres)).toBe(false);
    expect(resumeAcceptable("Vous avez gagné 55 500 FCFA en déclaré.", chiffres)).toBe(false);
  });
  it("refuse plus de trois phrases et le tiret cadratin", () => {
    expect(resumeAcceptable("Un. Deux. Trois. Quatre.", chiffres)).toBe(false);
    expect(resumeAcceptable("Belle journée — 14 ventes.", chiffres)).toBe(false);
  });
});

describe("configuration", () => {
  it("valeurs par défaut sans aucune variable", () => {
    const c = lireConfig({});
    expect(c).toMatchObject({
      port: 8080,
      anthropicApiKey: undefined,
      iaFournisseur: "anthropic",
      seedDemo: false,
      iaModele: "claude-opus-5-5",
    });
  });
  it("une clé vide équivaut à l'absence de clé", () => {
    expect(lireConfig({ ANTHROPIC_API_KEY: "  " }).anthropicApiKey).toBeUndefined();
  });
  it("refuse de démarrer sur une valeur invalide, avec les valeurs admises", () => {
    expect(() => lireConfig({ LOG_LEVEL: "bavard" })).toThrow(/fatal, error, warn, info ou debug/);
    expect(() => lireConfig({ CORS_ORIGINS: "*" })).toThrow(/interdit/);
    expect(() => lireConfig({ PORT: "99999" })).toThrow(/PORT/);
  });
});

describe("troncature des IP dans les journaux", () => {
  it("IPv4 au /24, IPv6 au /48", () => {
    expect(tronquerIp("196.207.12.34")).toBe("196.207.12.0/24");
    expect(tronquerIp("::ffff:10.1.2.3")).toBe("10.1.2.0/24");
    expect(tronquerIp("2001:db8:abcd:12::1")).toBe("2001:db8:abcd::/48");
  });
});
