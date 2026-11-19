// Contrôle du montant FCFA d'une vente prouvée (issue #37), côté prêteur uniquement.
//
// Pourquoi : la préimage prouve qu'une facture a été payée, pas combien de FCFA elle valait.
// Sans ce contrôle, un commerçant encaisse 1 sat et inscrit 100 000 FCFA « prouvés ».
// Le cours ne peut PAS venir du passeport : le commerçant le signe lui-même, il pourrait
// donc aussi falsifier le cours. La référence est obtenue par le prêteur (historique public).

/** Cours de référence connu du prêteur, du plus précis au plus grossier. */
export type ReferenceCours =
  | { niveau: "jour"; parJour: ReadonlyMap<string, number> }
  | { niveau: "courant"; fcfaParBtc: number }
  | { niveau: "plage" };

export type NiveauControle = ReferenceCours["niveau"];

/** Écart toléré entre le cours implicite d'une vente et le cours de référence.
 *  - jour : le cours varie dans la journée et le commerçant arrondit ; 10 % laisse passer une
 *    vente honnête et borne une tricherie à +10 %.
 *  - courant : le cours d'aujourd'hui pour une vente d'il y a 90 jours ; le bitcoin bouge
 *    plus, d'où 35 %. Moins précis : l'écran le dit.
 *  - plage : aucun cours disponible ; on écarte seulement l'absurde (x20 autour du marché). */
const TOLERANCE_JOUR = 0.1;
const TOLERANCE_COURANT = 0.35;
const PLAGE_FCFA_PAR_BTC: [number, number] = [10_000_000, 200_000_000];
const SATS_PAR_BTC = 100_000_000;

const cleJourUtc = (ts: number) => new Date(ts * 1000).toISOString().slice(0, 10);

/** Cours candidats pour une vente : le jour (UTC) de la vente et le lendemain, car le point
 *  quotidien de l'historique est pris à 00:00 UTC. */
function coursDuJour(parJour: ReadonlyMap<string, number>, ts: number): number[] {
  return [cleJourUtc(ts), cleJourUtc(ts + 86_400)].flatMap((j) => {
    const c = parJour.get(j);
    return c ? [c] : [];
  });
}

const dansTolerance = (implicite: number, reference: number, tolerance: number) =>
  Math.abs(implicite - reference) / reference <= tolerance;

/** Vrai si `fcfa` est un prix plausible pour `sats` payés à la date `ts`. */
export function montantCoherent(fcfa: number, sats: number, ts: number, ref: ReferenceCours): boolean {
  if (!(sats > 0) || !(fcfa > 0)) return false;
  const implicite = (fcfa * SATS_PAR_BTC) / sats;
  if (ref.niveau === "jour") {
    const candidats = coursDuJour(ref.parJour, ts);
    // Vente hors de la fenêtre de l'historique (passeport ancien) : contrôle grossier.
    if (candidats.length === 0) return dansPlage(implicite);
    return candidats.some((c) => dansTolerance(implicite, c, TOLERANCE_JOUR));
  }
  if (ref.niveau === "courant") return dansTolerance(implicite, ref.fcfaParBtc, TOLERANCE_COURANT);
  return dansPlage(implicite);
}

const dansPlage = (implicite: number) =>
  implicite >= PLAGE_FCFA_PAR_BTC[0] && implicite <= PLAGE_FCFA_PAR_BTC[1];

/** Phrase pour « Ce qui a été vérifié ». */
export function libelleControle(niveau: NiveauControle): string {
  if (niveau === "jour") return "Montant de chaque paiement comparé au cours du bitcoin le jour de la vente (écart toléré : 10 %).";
  if (niveau === "courant") return "Montant de chaque paiement comparé au cours actuel du bitcoin (contrôle approximatif, écart toléré : 35 %).";
  return "Montant de chaque paiement contrôlé seulement de façon grossière : cours du bitcoin indisponible.";
}
