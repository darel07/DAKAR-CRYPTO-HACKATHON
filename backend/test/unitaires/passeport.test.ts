import { deflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import { chargeDemo } from "../../src/demo.js";
import { nouvelIdentifiant } from "../../src/passeports/service.js";
import { chargeValide, decoderCharge } from "../../src/passeports/verification.js";
import { chargeSignee } from "../outils.js";

describe("vérification d'une charge de passeport", () => {
  it("accepte un passeport signé valide", () => {
    expect(chargeValide(chargeSignee())).toBe(true);
  });
  it("refuse une signature altérée", () => {
    expect(chargeValide(chargeSignee({ alterer: true }))).toBe(false);
  });
  it("refuse un mauvais kind", () => {
    expect(chargeValide(chargeSignee({ kind: 1 }))).toBe(false);
  });
  it("refuse une mauvaise étiquette d", () => {
    expect(chargeValide(chargeSignee({ etiquette: "autre-chose" }))).toBe(false);
  });
  it("refuse plus de 5 000 lignes", () => {
    const t = Math.floor(Date.now() / 1000);
    const lignes = Array.from({ length: 5_001 }, (_, i): [number, number, "D"] => [t - i, 100, "D"]);
    expect(chargeValide(chargeSignee({ lignes }))).toBe(false);
  });
  it("refuse une charge qui n'est pas du base64url ou pas du deflate", () => {
    expect(chargeValide("pas une charge !")).toBe(false);
    expect(chargeValide(Buffer.from("texte brut").toString("base64url"))).toBe(false);
  });
  it("refuse une bombe de décompression", () => {
    const bombe = deflateSync(Buffer.alloc(10 * 1024 * 1024, 32)).toString("base64url");
    expect(bombe.length).toBeLessThan(64 * 1024);
    expect(() => decoderCharge(bombe)).toThrow();
    expect(chargeValide(bombe)).toBe(false);
  });
  it("le passeport de démonstration est valide", () => {
    expect(chargeValide(chargeDemo())).toBe(true);
  });
});

describe("identifiants", () => {
  it("10 caractères base62, sans collision sur 10 000 tirages", () => {
    const ids = new Set(Array.from({ length: 10_000 }, nouvelIdentifiant));
    expect(ids.size).toBe(10_000);
    for (const id of ids) expect(id).toMatch(/^[0-9A-Za-z]{10}$/);
  });
});
