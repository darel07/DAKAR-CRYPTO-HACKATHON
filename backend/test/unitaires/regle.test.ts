import { describe, expect, it } from "vitest";
import { analyserParRegle } from "../../src/ia/regle.js";

describe("règle locale d'analyse (portage du front)", () => {
  it.each([
    ["2 sacs de riz, 15 000", 15_000, "2 sacs de riz"],
    ["huile 6500 fcfa", 6_500, "huile"],
    ["3 pains 1.500", 1_500, "3 pains"],
    ["tissu 12k", 12_000, "tissu"],
    ["savon 2 mille", 2_000, "savon"],
    ["sucre 1 250", 1_250, "sucre"],
  ])("« %s » → %i FCFA", (texte, montant, libelle) => {
    const r = analyserParRegle(texte);
    expect(r.montantFcfa).toBe(montant);
    expect(r.libelle).toBe(libelle);
    expect(r.confiance).toBe("basse");
  });

  it("sans nombre : montant null, libellé conservé", () => {
    expect(analyserParRegle("bonjour")).toMatchObject({ montantFcfa: null, libelle: "bonjour" });
  });

  it("au-delà de 10 000 000 FCFA : montant null", () => {
    expect(analyserParRegle("terrain 25 000 000").montantFcfa).toBeNull();
  });

  it("repère la quantité en tête du libellé", () => {
    expect(analyserParRegle("2 sacs de riz, 15 000").quantite).toBe(2);
    expect(analyserParRegle("huile 6500").quantite).toBeNull();
  });

  it.each([
    ["riz 5000 wave", "wave"],
    ["riz 5000 orange money", "orange_money"],
    ["riz 5000 en espèces", "especes"],
    ["riz 5000", null],
  ])("moyen de paiement : « %s » → %s", (texte, moyen) => {
    expect(analyserParRegle(texte).moyen).toBe(moyen);
  });
});
