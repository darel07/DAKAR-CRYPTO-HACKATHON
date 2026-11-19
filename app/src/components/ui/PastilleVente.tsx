import { statutVente } from "../../lib/domain/statut";
import type { Vente } from "../../lib/domain/types";
import { Badge } from "./Badge";

const PASTILLES = {
  prouve: { ton: "prouve", libelle: "Prouvé" },
  demo: { ton: "neutre", libelle: "Démo" },
  declare: { ton: "declare", libelle: "Déclaré" },
} as const;

/** Pastille de statut d'une vente : Prouvé, Démo (paiement simulé) ou Déclaré. */
export function PastilleVente({ vente }: { vente: Vente }) {
  const { ton, libelle } = PASTILLES[statutVente(vente)];
  return <Badge ton={ton}>{libelle}</Badge>;
}
