import type { InputHTMLAttributes, ReactNode } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "type"> {
  label: ReactNode;
}

/** Case à cocher native : toute la ligne est cliquable (cible ≥ 48 px). */
export function Checkbox({ label, className, ...reste }: CheckboxProps) {
  return (
    <label className={["case", className].filter(Boolean).join(" ")}>
      <input type="checkbox" className="case__entree" {...reste} />
      <span className="case__libelle">{label}</span>
    </label>
  );
}
