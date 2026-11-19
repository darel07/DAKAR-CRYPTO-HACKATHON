import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { describe, expect, it, vi } from "vitest";
import type { ReferenceCours } from "../controleMontants";

// Le décodeur est simulé : la facture « lnbc-<msat>-<hash> » porte son montant et son hash.
vi.mock("light-bolt11-decoder", () => ({
  decode: (facture: string) => {
    const [, msat, hash] = facture.split("-");
    return { sections: [{ name: "payment_hash", value: hash }, { name: "amount", value: msat }] };
  },
}));
const { verifier } = await import("../verification");

const preimage = "11".repeat(32);
const hash = bytesToHex(sha256(Uint8Array.from(Buffer.from(preimage, "hex"))));
const ts = Date.UTC(2026, 10, 18, 14) / 1000;
const ref: ReferenceCours = { niveau: "jour", parJour: new Map([["2026-11-18", 40_000_000]]) };

function passeport(lignes: unknown[]) {
  const contenu = { v: 1, devise: "XOF", debut: ts - 30 * 86_400, fin: ts + 60, lignes };
  return finalizeEvent(
    { kind: 30078, created_at: ts + 60, tags: [["d", "passeport-revenus"]], content: JSON.stringify(contenu) },
    generateSecretKey(),
  );
}

describe("vérification d'un passeport par le prêteur", () => {
  it("paiement de 10 000 sats déclaré 4 000 FCFA : prouvé", () => {
    const v = verifier(passeport([[ts, 4_000, "L", `lnbc-10000000-${hash}`, preimage]]), ref);
    expect(v).toMatchObject({ signatureValide: true, totalProuve: 4_000, nbProuvees: 1, montantsRejetes: 0, controle: "jour" });
  });

  it("le même paiement déclaré 100 000 FCFA : montant rejeté, rien de prouvé", () => {
    const v = verifier(passeport([[ts, 100_000, "L", `lnbc-10000000-${hash}`, preimage]]), ref);
    expect(v).toMatchObject({ totalProuve: 0, nbProuvees: 0, montantsRejetes: 1, preuvesRejetees: 0 });
    expect(v.plafondProuve).toBe(0);
  });

  it("préimage fausse : preuve rejetée (pas comptée comme montant)", () => {
    const v = verifier(passeport([[ts, 4_000, "L", `lnbc-10000000-${hash}`, "22".repeat(32)]]), ref);
    expect(v).toMatchObject({ preuvesRejetees: 1, montantsRejetes: 0, totalProuve: 0 });
  });

  it("ventes déclarées inchangées", () => {
    const v = verifier(passeport([[ts, 15_000, "D"]]), ref);
    expect(v).toMatchObject({ totalDeclare: 15_000, nbDeclarees: 1 });
  });
});
