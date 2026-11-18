import { useId, useState } from "react";
import type { InputHTMLAttributes, ReactNode } from "react";
import { Eye, EyeOff } from "lucide-react";

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  aide?: ReactNode;
  erreur?: string | null;
  /** Champ secret (lien de connexion) : masqué par défaut, bouton œil pour l'afficher. */
  revelable?: boolean;
}

/** Label au-dessus, aide et erreur reliées par aria-describedby : écrit une seule fois,
 *  donc impossible de créer un champ inaccessible dans un écran. Jamais de placeholder seul. */
export function Field({ label, aide, erreur, revelable, id, className, type, ...reste }: FieldProps) {
  const genere = useId();
  const champId = id ?? genere;
  const [visible, setVisible] = useState(false);
  const idAide = aide ? `${champId}-aide` : undefined;
  const idErreur = erreur ? `${champId}-erreur` : undefined;
  const decrit = [idAide, idErreur].filter(Boolean).join(" ") || undefined;
  const typeEffectif = revelable ? (visible ? "text" : "password") : type;

  return (
    <div className={["champ", erreur && "champ--erreur", className].filter(Boolean).join(" ")}>
      <label className="champ__label" htmlFor={champId}>{label}</label>
      <div className="champ__cadre">
        <input
          id={champId}
          type={typeEffectif}
          className="champ__entree"
          aria-invalid={erreur ? true : undefined}
          aria-describedby={decrit}
          {...reste}
        />
        {revelable && (
          <button
            type="button"
            className="champ__oeil"
            aria-pressed={visible}
            aria-label="Afficher le contenu du champ"
            onClick={() => setVisible((v) => !v)}
          >
            {visible ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
          </button>
        )}
      </div>
      {aide && <span id={idAide} className="champ__aide">{aide}</span>}
      {erreur && <span id={idErreur} className="champ__erreur" role="alert">{erreur}</span>}
    </div>
  );
}
