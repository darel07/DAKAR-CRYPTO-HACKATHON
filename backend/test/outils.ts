import type { FastifyInstance } from "fastify";
import { Writable } from "node:stream";
import { deflateSync } from "node:zlib";
import { finalizeEvent, generateSecretKey } from "nostr-tools/pure";
import { construireApp } from "../src/app.js";
import { ouvrirBase } from "../src/base.js";
import { lireConfig } from "../src/config.js";
import { creerEtat, type Substitutions } from "../src/etat.js";
import type { Fournisseur } from "../src/taux/fournisseurs.js";

/** Fournisseur de cours simulé : aucun appel réseau dans les tests. */
export const fournisseurFixe = (nom: Fournisseur["nom"], eur: number | Error): Fournisseur => ({
  nom,
  btcEnEur: async () => {
    if (eur instanceof Error) throw eur;
    return eur;
  },
});

/** Application complète sur base SQLite en mémoire, journaux capturés. */
export async function appDeTest(sub: Substitutions = {}, avantRoutes?: (app: FastifyInstance) => void) {
  const journaux: string[] = [];
  const flux = new Writable({
    write(morceau: Buffer, _enc, fin) {
      journaux.push(morceau.toString());
      fin();
    },
  });
  const config = lireConfig({ DATABASE_PATH: ":memory:", FRONT_DIST: "/inexistant", LOG_LEVEL: "info" });
  const db = ouvrirBase(":memory:");
  const etat = creerEtat(config, db, {
    clientIA: null,
    fournisseurs: [fournisseurFixe("coingecko", 60_000)],
    sourceHistorique: historiqueFixe,
    ...sub,
  });
  const app = await construireApp(etat, { fluxJournal: flux, ...(avantRoutes ? { avantRoutes } : {}) });
  await app.ready();
  return { app, etat, db, journaux: () => journaux.join("") };
}

type Ligne = [number, number, "D"] | [number, number, "L", string, string, ...unknown[]];

/** Fabrique une charge de passeport signée, au format exact de `encoder()` du front. */
export function chargeSignee(
  options: { lignes?: Ligne[]; kind?: number; etiquette?: string; alterer?: boolean; v?: number } = {},
): string {
  const fin = Math.floor(Date.now() / 1000);
  const contenu = {
    v: options.v ?? 1,
    devise: "XOF",
    debut: fin - 30 * 86_400,
    fin,
    lignes: options.lignes ?? [[fin - 3600, 15_000, "D"]],
  };
  const evenement = finalizeEvent(
    {
      kind: options.kind ?? 30078,
      created_at: fin,
      tags: [["d", options.etiquette ?? "passeport-revenus"]],
      content: JSON.stringify(contenu),
    },
    generateSecretKey(),
  );
  if (options.alterer) evenement.content = evenement.content.replace("15000", "150000");
  return deflateSync(Buffer.from(JSON.stringify(evenement))).toString("base64url");
}

/** Historique simulé : 90 jours à 60 000 €/BTC jusqu'à aujourd'hui. */
export const historiqueFixe = async (): Promise<[number, number][]> => {
  const aujourdhui = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return Array.from({ length: 91 }, (_, i): [number, number] => [aujourdhui - (90 - i) * 86_400_000, 60_000]);
};
