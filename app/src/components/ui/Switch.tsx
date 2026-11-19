import { useId } from "react";
import type { ReactNode } from "react";

interface SwitchProps {
  label: string;
  /** Phrase sous la ligne, reliée par aria-describedby. */
  aide?: ReactNode;
  checked: boolean;
  onChange(checked: boolean): void;
  disabled?: boolean;
  /** Icône décorative en début de ligne (écran Réglages). */
  icone?: ReactNode;
}

/** Interrupteur : vraie case à cocher avec role=switch (l'état coché devient aria-checked
 *  tout seul). Toute la ligne est cliquable ; la pastille glisse avec le ressort léger. */
export function Switch({ label, aide, checked, onChange, disabled, icone }: SwitchProps) {
  const id = useId();
  const idAide = aide ? `${id}-aide` : undefined;
  return (
    <div className="interrupteur">
      <label className="interrupteur__ligne" htmlFor={id}>
        {icone && <span className="interrupteur__icone" aria-hidden="true">{icone}</span>}
        <span className="interrupteur__label">{label}</span>
        <span className="interrupteur__piste">
          <input
            id={id}
            type="checkbox"
            role="switch"
            className="interrupteur__entree"
            checked={checked}
            disabled={disabled}
            aria-describedby={idAide}
            onChange={(e) => onChange(e.target.checked)}
          />
          <span className="interrupteur__pastille" aria-hidden="true" />
        </span>
      </label>
      {aide && <p id={idAide} className="interrupteur__aide">{aide}</p>}
    </div>
  );
}
