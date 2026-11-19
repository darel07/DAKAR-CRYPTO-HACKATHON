import { randomBytes } from "node:crypto";
import { deflateSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import type { FastifyInstance } from "fastify";
import { finalizeEvent, generateSecretKey, getPublicKey } from "nostr-tools/pure";
import { appDeTest, chargeSignee } from "../outils.js";

let app: FastifyInstance | undefined;
afterEach(async () => {
  await app?.close();
  app = undefined;
});

const maintenant = () => Math.floor(Date.now() / 1000);
const cleCommercant = generateSecretKey();
const commercant = getPublicKey(cleCommercant);

function recu(options: { paymentHash?: string; d?: string; montant?: number } = {}) {
  const paymentHash = options.paymentHash ?? randomBytes(32).toString("hex");
  const ev = finalizeEvent(
    {
      kind: 30078,
      created_at: maintenant(),
      tags: [["d", options.d ?? `recu:${paymentHash}`]],
      content: JSON.stringify({ v: 1, montantFcfa: options.montant ?? 2500, ts: maintenant(), paymentHash }),
    },
    cleCommercant,
  );
  return { paymentHash, charge: deflateSync(Buffer.from(JSON.stringify(ev))).toString("base64url") };
}

function confirmation(paymentHash: string, options: { cle?: Uint8Array; p?: string } = {}) {
  return finalizeEvent(
    {
      kind: 30078,
      created_at: maintenant(),
      tags: [
        ["d", `confirmation:${paymentHash}`],
        ["p", options.p ?? commercant],
      ],
      content: "",
    },
    options.cle ?? generateSecretKey(),
  );
}

async function creer(a: FastifyInstance, charge: string) {
  return a.inject({ method: "POST", url: "/api/recus", payload: { charge } });
}

describe("reçus clients", () => {
  it("création, lecture sans confirmation, lien court", async () => {
    ({ app } = await appDeTest());
    const r = recu();
    const c = await creer(app, r.charge);
    expect(c.statusCode).toBe(201);
    expect(c.json().url).toBe(`http://localhost:8080/#/recu-client/r/${c.json().id}`);
    const l = await app.inject({ method: "GET", url: `/api/recus/${c.json().id}` });
    expect(l.json()).toMatchObject({ charge: r.charge, confirmation: null });
    expect(l.headers["cache-control"]).toBe("no-store");
  });

  it("même reçu deux fois → même identifiant", async () => {
    ({ app } = await appDeTest());
    const { charge } = recu();
    expect((await creer(app, charge)).json().id).toBe((await creer(app, charge)).json().id);
  });

  it.each([
    ["balise d incohérente", () => recu({ d: "recu:autre" }).charge],
    ["montant nul", () => recu({ montant: 0 }).charge],
    ["un passeport n'est pas un reçu", () => chargeSignee()],
    ["charge illisible", () => "pas-un-recu"],
  ])("refus : %s → 422", async (_nom, fabriquer) => {
    ({ app } = await appDeTest());
    expect((await creer(app, fabriquer())).statusCode).toBe(422);
  });

  it("reçu de plus de 8 Kio → 413", async () => {
    ({ app } = await appDeTest());
    expect((await creer(app, "A".repeat(9 * 1024))).statusCode).toBe(413);
  });

  it("confirmation valide → 201, puis visible à la lecture ; rejouée → même résultat", async () => {
    ({ app } = await appDeTest());
    const r = recu();
    const id = (await creer(app, r.charge)).json().id;
    const ev = confirmation(r.paymentHash);
    const url = `/api/recus/${id}/confirmation`;
    const c1 = await app.inject({ method: "POST", url, payload: { evenement: ev } });
    expect(c1.statusCode).toBe(201);
    const c2 = await app.inject({ method: "POST", url, payload: { evenement: ev } });
    expect(c2.json().confirmeLe).toBe(c1.json().confirmeLe);
    const l = await app.inject({ method: "GET", url: `/api/recus/${id}` });
    expect(l.json().confirmation.id).toBe(ev.id);
  });

  it("seconde confirmation différente → 409 CONFLICT", async () => {
    ({ app } = await appDeTest());
    const r = recu();
    const id = (await creer(app, r.charge)).json().id;
    const url = `/api/recus/${id}/confirmation`;
    await app.inject({ method: "POST", url, payload: { evenement: confirmation(r.paymentHash) } });
    const c = await app.inject({ method: "POST", url, payload: { evenement: confirmation(r.paymentHash) } });
    expect(c.statusCode).toBe(409);
    expect(c.json().error.code).toBe("CONFLICT");
  });

  it.each([
    ["signée par le commerçant lui-même", (h: string) => confirmation(h, { cle: cleCommercant })],
    ["pour un autre paiement", () => confirmation(randomBytes(32).toString("hex"))],
    ["pour un autre commerçant", (h: string) => confirmation(h, { p: "f".repeat(64) })],
    [
      "signature altérée",
      (h: string) => {
        const ev = confirmation(h);
        return { ...ev, content: "modifié" };
      },
    ],
  ])("confirmation refusée : %s → 422", async (_nom, fabriquer) => {
    ({ app } = await appDeTest());
    const r = recu();
    const id = (await creer(app, r.charge)).json().id;
    const c = await app.inject({
      method: "POST",
      url: `/api/recus/${id}/confirmation`,
      payload: { evenement: fabriquer(r.paymentHash) },
    });
    expect(c.statusCode).toBe(422);
  });

  it("reçu inconnu ou identifiant mal formé → 404", async () => {
    ({ app } = await appDeTest());
    expect((await app.inject({ method: "GET", url: "/api/recus/inconnu000" })).statusCode).toBe(404);
    expect((await app.inject({ method: "GET", url: "/api/recus/x" })).statusCode).toBe(404);
  });
});

describe("passeports : extensions de ligne acceptées", () => {
  it("v2 avec cours et contresignature en fin de ligne Lightning → 201", async () => {
    ({ app } = await appDeTest());
    const t = maintenant();
    const charge = chargeSignee({
      v: 2,
      lignes: [[t - 60, 2500, "L", "lnbc1facture", "00".repeat(32), 38_000_000, { id: "x" }]],
    });
    const r = await app.inject({ method: "POST", url: "/api/passeports", payload: { charge } });
    expect(r.statusCode).toBe(201);
  });
});
