import { useId } from "react";
import type { InputHTMLAttributes } from "react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  aide?: string;
  erreur?: string | null;
}

/** Label lié, aide et erreur reliées par aria-describedby : écrit une seule fois,
 *  donc impossible de créer un champ inaccessible dans un écran. */
export function Field({ label, aide, erreur, id, className = "", ...reste }: FieldProps) {
  const genere = useId();
  const champId = id ?? genere;
  const idAide = aide ? `${champId}-aide` : undefined;
  const idErreur = erreur ? `${champId}-erreur` : undefined;
  const decrit = [idAide, idErreur].filter(Boolean).join(" ") || undefined;
  return (
    <div className={`champ${erreur ? " champ--erreur" : ""} ${className}`.trim()}>
      <label className="champ__label" htmlFor={champId}>{label}</label>
      <input
        id={champId}
        className="champ__entree"
        aria-invalid={erreur ? true : undefined}
        aria-describedby={decrit}
        {...reste}
      />
      {aide && <span id={idAide} className="champ__aide">{aide}</span>}
      {erreur && <span id={idErreur} className="champ__erreur" role="alert">{erreur}</span>}
    </div>
  );
}
