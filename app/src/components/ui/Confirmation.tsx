import type { ReactNode } from "react";
import { Button } from "./Button";
import { Sheet } from "./Sheet";

interface ConfirmationProps {
  ouvert: boolean;
  /** La question (« Annuler cette demande de paiement ? »). */
  titre: string;
  children?: ReactNode;
  /** Libellé de l'action (« Effacer 12 ventes »). */
  confirmer: string;
  /** Libellé de l'action sûre. */
  annuler?: string;
  /** Action destructive : bouton rouge. */
  danger?: boolean;
  onConfirmer(): void;
  onAnnuler(): void;
}

/** Confirmation explicite, dans une feuille du bas. Le focus arrive sur l'action sûre :
 *  un double appui distrait ne détruit rien. */
export function Confirmation({ ouvert, titre, children, confirmer, annuler = "Annuler", danger, onConfirmer, onAnnuler }: ConfirmationProps) {
  return (
    <Sheet
      ouvert={ouvert}
      onFermer={onAnnuler}
      titre={titre}
      boutonFermer={false}
      pied={
        <>
          <Button variante={danger ? "danger" : "primaire"} bloc onClick={onConfirmer}>{confirmer}</Button>
          <Button variante="secondaire" bloc onClick={onAnnuler} data-autofocus="">{annuler}</Button>
        </>
      }
    >
      {children}
    </Sheet>
  );
}
