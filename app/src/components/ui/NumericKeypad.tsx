import { useEffect, useRef } from "react";
import { Delete } from "lucide-react";

const TOUCHES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0"] as const;
const APPUI_LONG_MS = 500;

/** Petit retour haptique, si le téléphone le permet (pas sur iPhone). */
const vibrer = () => { navigator.vibrate?.(8); };

interface NumericKeypadProps {
  /** Chiffres saisis, sans zéro de tête (« 12500 »). */
  valeur: string;
  onChange(valeur: string): void;
  /** Plafond par vente en FCFA (préférence). Au-delà, la touche ne fait rien. */
  plafond: number;
  /** Appelé quand une touche aurait dépassé le plafond : l'écran affiche le message. */
  onDepassement?(): void;
}

/** Pavé 3 × 4 à grosses touches : seul moyen de saisir le montant, aucun clavier système
 *  (lent et imprévisible sur un téléphone d'entrée de gamme). Appui long sur effacer = tout effacer. */
export function NumericKeypad({ valeur, onChange, plafond, onDepassement }: NumericKeypadProps) {
  const minuteur = useRef<number | undefined>(undefined);
  const appuiLong = useRef(false);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  const saisir = (touche: string) => {
    vibrer();
    const suivant = (valeur + touche).replace(/^0+/, "");
    if (!suivant || suivant === valeur) return;
    if (Number(suivant) > plafond) { onDepassement?.(); return; }
    onChange(suivant);
  };

  const debutAppui = () => {
    appuiLong.current = false;
    window.clearTimeout(minuteur.current);
    minuteur.current = window.setTimeout(() => {
      appuiLong.current = true;
      vibrer();
      onChange("");
    }, APPUI_LONG_MS);
  };
  const finAppui = () => window.clearTimeout(minuteur.current);

  const effacer = () => {
    // Le clic qui suit un appui long ne doit pas effacer un chiffre de plus.
    if (appuiLong.current) { appuiLong.current = false; return; }
    vibrer();
    onChange(valeur.slice(0, -1));
  };

  return (
    <div className="pave" role="group" aria-label="Pavé numérique" onContextMenu={(e) => e.preventDefault()}>
      {TOUCHES.map((t) => (
        <button key={t} type="button" className="pave__touche" onClick={() => saisir(t)}>{t}</button>
      ))}
      <button
        type="button"
        className="pave__touche pave__touche--effacer"
        aria-label="Effacer le dernier chiffre"
        onClick={effacer}
        onPointerDown={debutAppui}
        onPointerUp={finAppui}
        onPointerLeave={finAppui}
        onPointerCancel={finAppui}
      >
        <Delete aria-hidden="true" />
      </button>
    </div>
  );
}
