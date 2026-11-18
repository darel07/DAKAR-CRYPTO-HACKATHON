import type { Vente } from "../../lib/domain/types";
import type { JourGraphe } from "../../components/ui";

// Données fictives de la page d'aperçu uniquement. Les ventes « lightning » n'ont pas de
// vraie preuve : elles ne quittent jamais cette page (rien n'est écrit dans le stockage).

const JOUR = 86400;

export function ventesExemple(maintenant: number): Vente[] {
  const v = (decalage: number, montantFcfa: number, libelle: string, lightning: boolean): Vente => ({
    id: `apercu-${decalage}`,
    ts: maintenant - decalage,
    montantFcfa,
    libelle,
    type: lightning ? "lightning" : "declaree",
  });
  return [
    v(600, 12_500, "Paiement Lightning", true),
    v(4_200, 15_000, "2 sacs de riz", false),
    v(9_000, 3_200, "Lait en poudre", false),
    v(JOUR + 3_600, 6_500, "Huile 5 litres", false),
    v(JOUR + 7_200, 45_500, "Paiement Lightning", true),
    v(3 * JOUR, 1_800, "Savon x6", false),
  ];
}

export const SEMAINE_EXEMPLE: JourGraphe[] = [
  { court: "jeu.", long: "jeudi", valeur: 18_000 },
  { court: "ven.", long: "vendredi", valeur: 27_400 },
  { court: "sam.", long: "samedi", valeur: 38_900 },
  { court: "dim.", long: "dimanche", valeur: 9_500 },
  { court: "lun.", long: "lundi", valeur: 22_100 },
  { court: "mar.", long: "mardi", valeur: 45_500 },
  { court: "mer.", long: "mercredi", valeur: 30_700 },
];

/** Facture factice (n'est pas une vraie demande de paiement), de la longueur d'une vraie. */
export const FACTURE_EXEMPLE =
  "lnbc189400n1pn7x2q3pp5qz8l0r6k9w4m2v7t5y3c8s0h6j1f9d4a2e7u5i3o8p6l1k9j7h5g3qdq0xqrrssscqzpgsp5x8c7v6b5n4m3q2w1e9r8t7y6u5i4o3p2a1s9d8f7g6h5j4k3l2z1x0c9v8b7n6m5q4w3e2r1t0y9u8i7o6p5a4s3d2f1g0h9j8k7l6z5x4c3v2b1n0m9q8w7e6r5t4yqpgqxqp";

export const COULEURS = [
  "c-fond", "c-surface", "c-surface-2", "c-surface-h", "c-texte", "c-texte-doux", "c-bord", "c-bord-champ",
  "c-primaire", "c-ambre", "c-btc", "c-succes", "c-prouve-fond", "c-prouve-texte",
  "c-declare-fond", "c-declare-texte", "c-erreur-fond", "c-erreur-texte",
] as const;
