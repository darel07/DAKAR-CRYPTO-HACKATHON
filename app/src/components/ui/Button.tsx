import type { ButtonHTMLAttributes } from "react";

type Variante = "primaire" | "secondaire" | "discret" | "danger";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  grand?: boolean;
  bloc?: boolean;
}

/** L'union de variantes empêche `variante="primary"` de passer en silence. */
export function Button({ variante = "primaire", grand, bloc, className = "", type = "button", ...reste }: ButtonProps) {
  const classes = ["btn", `btn--${variante}`, grand && "btn--grand", bloc && "btn--bloc", className]
    .filter(Boolean)
    .join(" ");
  return <button type={type} className={classes} {...reste} />;
}
