import { describe, expect, it } from "vitest";
import { contientUnNombre, rendreCoherent } from "../../src/ia/coherence.js";
import type { VenteIA } from "../../src/ia/schemas.js";

const v = (p: Partial<VenteIA>): VenteIA => ({
  libelle: "riz",
  quantite: null,
  montantFcfa: 15000,
  moyen: null,
  confiance: "haute",
  ...p,
});

describe("garde-fou contre les montants et libellés inventés", () => {
  it("détecte les nombres en chiffres et en lettres", () => {
    expect(contientUnNombre("riz 15000")).toBe(true);
    expect(contientUnNombre("quinze mille pour le sucre")).toBe(true);
    expect(contientUnNombre("bonjour")).toBe(false);
  });

  it("« bonjour » → aucun montant, libellé repris de la phrase (mesuré : un modèle inventait 15 000)", () => {
    expect(rendreCoherent("bonjour", v({ libelle: "2 sacs de riz", quantite: 2 }))).toMatchObject({
      libelle: "bonjour",
      montantFcfa: null,
      quantite: null,
      confiance: "basse",
    });
  });

  it("désaccord avec la règle locale → confiance basse (l'écran demande de vérifier)", () => {
    expect(rendreCoherent("riz 2500", v({ montantFcfa: 25000 })).confiance).toBe("basse");
  });

  it("accord avec la règle, ou montant en lettres que la règle ne lit pas → proposition gardée", () => {
    expect(rendreCoherent("riz 15 000", v({}))).toMatchObject({ montantFcfa: 15000, confiance: "haute" });
    expect(rendreCoherent("quinze mille pour le riz", v({}))).toMatchObject({
      montantFcfa: 15000,
      confiance: "haute",
    });
  });

  it("libellé sans mot commun avec la phrase → libellé de la règle locale", () => {
    expect(rendreCoherent("riz 2500", v({ libelle: "soupe", montantFcfa: 2500 })).libelle).toBe("riz");
  });
});
