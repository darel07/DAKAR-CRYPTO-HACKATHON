import { Backspace } from "@phosphor-icons/react";

interface PaveProps {
  onChiffre(c: string): void;
  onEffacer(): void;
}

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"] as const;

/** Pavé numérique à gros boutons : seul moyen de saisie du montant sur la caisse. */
export function Pave({ onChiffre, onEffacer }: PaveProps) {
  return (
    <div className="pave" role="group" aria-label="Pavé numérique">
      {TOUCHES.map((t) => (
        <button key={t} type="button" className="pave__touche" onClick={() => onChiffre(t)}>{t}</button>
      ))}
      <button type="button" className="pave__touche pave__touche--action" onClick={onEffacer} aria-label="Effacer le dernier chiffre">
        <Backspace size={28} aria-hidden="true" />
      </button>
    </div>
  );
}
