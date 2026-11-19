import { createHash } from "node:crypto";
import { deflateSync } from "node:zlib";
import { finalizeEvent } from "nostr-tools/pure";
import type { DepotPasseports } from "./passeports/depot.js";
import { empreinte, DUREE_VIE_S } from "./passeports/service.js";
import { ETIQUETTE, KIND_PASSEPORT } from "./passeports/verification.js";

export const ID_DEMO = "demo000000";

/** Clé de démonstration publique et déterministe : elle ne protège rien et ne sert qu'à
 *  produire un passeport d'exemple. Ne jamais l'utiliser pour un vrai commerçant. */
const CLE_DEMO = createHash("sha256").update("caisse-lightning:passeport-de-demonstration").digest();

/** Facture Lightning bien formée mais sans préimage correspondante : la vue prêteur doit
 *  la compter parmi les preuves rejetées. Le jeu de démo ne contient aucune fausse preuve valide. */
const FACTURE_INVALIDE =
  "lnbc2500u1pvjluezpp5qqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqqqsyqcyq5rqwzqfqypqdq5xysxxatsyp3k7enxv4jsxqzpuaztrnwngzn3kdzw5hydlzf03qdgm2hdq27cqv3agm2awhz5se903vruatfhq77w3ls4evs3ch9zw97j25emudupq63nyw24cg27h2rspfj9srp";
const PREIMAGE_FAUSSE = "00".repeat(32);

/** Générateur pseudo-aléatoire à graine fixe : le passeport de démo est le même à chaque essai. */
function hasard(graine: number): () => number {
  let s = graine;
  return () => {
    s = (s * 1_103_515_245 + 12_345) % 2 ** 31;
    return s / 2 ** 31;
  };
}

type Ligne = [number, number, "D"] | [number, number, "L", string, string];

function lignesDemo(debut: number): Ligne[] {
  const tirer = hasard(42);
  const lignes: Ligne[] = [];
  for (let jour = 0; jour < 30; jour++) {
    const ventes = 3 + Math.floor(tirer() * 6);
    for (let v = 0; v < ventes; v++) {
      const ts = debut + jour * 86_400 + 8 * 3600 + Math.floor(tirer() * 11 * 3600);
      lignes.push([ts, 500 + Math.round((tirer() * 14_500) / 50) * 50, "D"]);
    }
  }
  lignes.push([debut + 29 * 86_400 + 12 * 3600, 2500, "L", FACTURE_INVALIDE, PREIMAGE_FAUSSE]);
  return lignes.sort((a, b) => a[0] - b[0]);
}

/** Construit la charge (même format que `encoder()` du front) du passeport de démo. */
export function chargeDemo(instant = Math.floor(Date.now() / 1000)): string {
  const debut = instant - 30 * 86_400;
  const contenu = { v: 1, devise: "XOF", debut, fin: instant, lignes: lignesDemo(debut) };
  const evenement = finalizeEvent(
    { kind: KIND_PASSEPORT, created_at: instant, tags: [["d", ETIQUETTE]], content: JSON.stringify(contenu) },
    CLE_DEMO,
  );
  return deflateSync(Buffer.from(JSON.stringify(evenement))).toString("base64url");
}

/** Idempotent : crée ou rafraîchit le passeport « demo000000 » pour 30 jours. */
export function semerDemo(depot: DepotPasseports, instant = Math.floor(Date.now() / 1000)): void {
  const charge = chargeDemo(instant);
  depot.remplacer({
    id: ID_DEMO,
    empreinte: empreinte(charge),
    charge,
    creeLe: instant,
    expireLe: instant + DUREE_VIE_S,
  });
}
