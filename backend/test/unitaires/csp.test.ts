import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { empreintesScriptsEnLigne } from "../../src/securite.js";

const empreinte = (code: string) => `'sha256-${createHash("sha256").update(code).digest("base64")}'`;

describe("empreintes CSP des scripts en ligne", () => {
  it("retient le script en ligne, ignore les scripts externes et vides", () => {
    const code = "\n      try { document.documentElement.dataset.theme = 'sombre'; } catch (e) {}\n    ";
    const html = `<head><script>${code}</script><script type="module" src="/assets/a.js"></script><script> </script></head>`;
    expect(empreintesScriptsEnLigne(html)).toEqual([empreinte(code)]);
  });

  it("aucun script en ligne : aucune empreinte", () => {
    expect(empreintesScriptsEnLigne('<script type="module" crossorigin src="/x.js"></script>')).toEqual([]);
    expect(empreintesScriptsEnLigne("")).toEqual([]);
  });
});
