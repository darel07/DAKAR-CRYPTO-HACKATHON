import { useState } from "react";
import type { CSSProperties } from "react";
import { CircleAlert, CircleCheck, TriangleAlert } from "lucide-react";

export type EtatPaiement = "attente" | "confirme" | "expire" | "erreur";

const TEXTES: Record<EtatPaiement, string> = {
  attente: "En attente du paiement…",
  confirme: "Paiement reçu avec succès !",
  expire: "Cette demande de paiement a expiré.",
  erreur: "Impossible de contacter votre portefeuille.",
};

const ICONES = { confirme: CircleCheck, expire: TriangleAlert, erreur: CircleAlert } as const;

/** Anneau fin qui se vide au rythme du compte à rebours. Animation CSS pure (aucun état React
 *  par image) : la durée totale et le temps déjà écoulé sont passés en variables. */
function Anneau({ debut, expireLe }: { debut: number; expireLe: number }) {
  const [ouvertA] = useState(() => Date.now() / 1000);
  const duree = Math.max(1, expireLe - debut);
  const ecoule = Math.min(duree, Math.max(0, ouvertA - debut));
  const style = { "--anneau-duree": `${duree}s`, "--anneau-retard": `${-ecoule}s` } as CSSProperties;
  return (
    <svg className="anneau" viewBox="0 0 24 24" aria-hidden="true" style={style}>
      <circle className="anneau__piste" cx="12" cy="12" r="10" pathLength={100} />
      <circle className="anneau__reste" cx="12" cy="12" r="10" pathLength={100} />
    </svg>
  );
}

interface PaymentStatusProps {
  etat: EtatPaiement;
  /** Remplace le texte par défaut de l'état (rare). */
  message?: string;
  /** Pour l'anneau d'attente : création et expiration de la demande (secondes Unix). */
  debut?: number;
  expireLe?: number;
}

/** Statut du paiement. Rien ici ne suggère un succès avant l'état « confirme »,
 *  qui ne doit venir que du portefeuille (préimage reçue). */
export function PaymentStatus({ etat, message, debut, expireLe }: PaymentStatusProps) {
  const Icone = etat === "attente" ? null : ICONES[etat];
  return (
    <div className={`statut-paiement statut-paiement--${etat}`} role="status">
      {etat === "attente" && debut !== undefined && expireLe !== undefined && <Anneau debut={debut} expireLe={expireLe} />}
      {Icone && <Icone className="statut-paiement__icone" aria-hidden="true" />}
      <p className="statut-paiement__texte">{message ?? TEXTES[etat]}</p>
    </div>
  );
}
