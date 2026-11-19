import { afterEach, describe, expect, it, vi } from "vitest";
import { lireConfig } from "../../src/config.js";
import { creerClientCompatible } from "../../src/ia/compatibleOpenai.js";
import { creerClientIA } from "../../src/ia/fabrique.js";

const reponse = (contenu: string | null, fin = "stop", statut = 200) =>
  new Response(JSON.stringify({ choices: [{ message: { content: contenu }, finish_reason: fin }] }), {
    status: statut,
    headers: { "content-type": "application/json" },
  });

const VENTE = {
  libelle: "2 sacs de riz",
  quantite: 2,
  montantFcfa: 15000,
  moyen: "wave",
  confiance: "haute",
};
const client = creerClientCompatible("https://ia.exemple/v1", "cle-test", "modele-test");

afterEach(() => vi.unstubAllGlobals());

describe("fournisseur compatible OpenAI (Groq, Gemini, Ollama…)", () => {
  it("analyse : JSON valide → vente, requête conforme (modèle, clé, mode JSON)", async () => {
    const f = vi.fn(async () => reponse(JSON.stringify(VENTE)));
    vi.stubGlobal("fetch", f);
    expect(await client.analyser("2 sacs de riz 15000 wave")).toEqual(VENTE);
    const [url, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://ia.exemple/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer cle-test");
    const corps = JSON.parse(String(init.body));
    expect(corps).toMatchObject({ model: "modele-test", response_format: { type: "json_object" } });
  });

  it("JSON entouré de balises ```json : accepté", async () => {
    vi.stubGlobal("fetch", async () => reponse("```json\n" + JSON.stringify(VENTE) + "\n```"));
    expect(await client.analyser("riz")).toEqual(VENTE);
  });

  it.each([
    ["JSON invalide", reponse("pas du json")],
    ["schéma non respecté (montant négatif)", reponse(JSON.stringify({ ...VENTE, montantFcfa: -5 }))],
    ["contenu filtré", reponse(JSON.stringify(VENTE), "content_filter")],
    ["réponse vide", reponse(null)],
  ])("%s → null (règle locale)", async (_nom, r) => {
    vi.stubGlobal("fetch", async () => r);
    expect(await client.analyser("riz")).toBeNull();
  });

  it("erreur du fournisseur → exception (le service bascule sur la règle locale)", async () => {
    vi.stubGlobal("fetch", async () => reponse(null, "stop", 429));
    await expect(client.analyser("riz")).rejects.toThrow(/429/);
  });

  it("résumé : texte renvoyé", async () => {
    vi.stubGlobal("fetch", async () => reponse("Aujourd'hui, 14 ventes."));
    const r = await client.resumer({
      jour: "2026-11-19",
      totalFcfa: 1,
      nbVentes: 14,
      totalProuveFcfa: 0,
      meilleureHeure: null,
      articlesFrequents: [],
    });
    expect(r).toBe("Aujourd'hui, 14 ventes.");
  });
});

describe("choix du fournisseur", () => {
  it("par défaut : Anthropic, désactivé sans clé", () => {
    expect(creerClientIA(lireConfig({}))).toBeNull();
  });
  it("compatible-openai complet → client actif", () => {
    const c = lireConfig({
      IA_FOURNISSEUR: "compatible-openai",
      IA_URL_BASE: "https://api.groq.com/openai/v1/",
      IA_CLE: "x",
      IA_MODELE: "m",
    });
    expect(c.iaUrlBase).toBe("https://api.groq.com/openai/v1");
    expect(creerClientIA(c)).not.toBeNull();
  });
  it("compatible-openai avec clé mais sans URL → refus de démarrer ; sans modèle → IA désactivée", () => {
    expect(() => lireConfig({ IA_FOURNISSEUR: "compatible-openai", IA_CLE: "x" })).toThrow(/IA_URL_BASE/);
    const sansModele = lireConfig({
      IA_FOURNISSEUR: "compatible-openai",
      IA_CLE: "x",
      IA_URL_BASE: "https://a.b/v1",
    });
    expect(creerClientIA(sansModele)).toBeNull();
  });
  it("valeur inconnue → message avec les valeurs admises", () => {
    expect(() => lireConfig({ IA_FOURNISSEUR: "openai" })).toThrow(/anthropic ou compatible-openai/);
  });
});
