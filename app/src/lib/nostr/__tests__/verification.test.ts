import { bytesToHex } from "@noble/hashes/utils.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
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

const cleCommercant = generateSecretKey();
const commercant = getPublicKey(cleCommercant);

function passeport(lignes: unknown[]) {
  const contenu = { v: 1, devise: "XOF", debut: ts - 30 * 86_400, fin: ts + 60, lignes };
  return finalizeEvent(
    { kind: 30078, created_at: ts + 60, tags: [["d", "passeport-revenus"]], content: JSON.stringify(contenu) },
    cleCommercant,
  );
}

function confirmation(options: { cle?: Uint8Array; h?: string; p?: string } = {}) {
  return finalizeEvent(
    { kind: 30078, created_at: ts, tags: [["d", `confirmation:${options.h ?? hash}`], ["p", options.p ?? commercant]], content: "" },
    options.cle ?? generateSecretKey(),
  );
}

const ligne = (c?: unknown) => [ts, 4_000, "L", `lnbc-10000000-${hash}`, preimage, ...(c ? [c] : [])];

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

  it("contresignatures : valides comptées, clients distincts", () => {
    const client = generateSecretKey();
    const v = verifier(passeport([ligne(confirmation({ cle: client })), ligne(confirmation({ cle: client })), ligne(confirmation())]), ref);
    expect(v).toMatchObject({ nbProuvees: 3, nbContresignees: 3, clientsDistincts: 2 });
  });

  it("contresignatures refusées : par le commerçant, autre paiement, autre commerçant, altérée", () => {
    const alteree = { ...confirmation(), content: "modifié" };
    const v = verifier(passeport([
      ligne(confirmation({ cle: cleCommercant })),
      ligne(confirmation({ h: "ab".repeat(32) })),
      ligne(confirmation({ p: "f".repeat(64) })),
      ligne(alteree),
      ligne("pas un événement"),
    ]), ref);
    expect(v).toMatchObject({ nbProuvees: 5, nbContresignees: 0, clientsDistincts: 0 });
  });
});
