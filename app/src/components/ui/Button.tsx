import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";

export type VarianteBouton = "primaire" | "secondaire" | "discret" | "danger";
export type TailleBouton = "md" | "lg";

interface Apparence {
  variante?: VarianteBouton;
  /** md = 48 px, lg = 56 px. */
  taille?: TailleBouton;
  /** Pleine largeur. */
  bloc?: boolean;
  /** Icône Lucide placée avant le libellé (décorative). */
  icone?: ReactNode;
}

function classes({ variante = "primaire", taille = "md", bloc }: Apparence, extra?: string) {
  return ["btn", `btn--${variante}`, `btn--${taille}`, bloc && "btn--bloc", extra].filter(Boolean).join(" ");
}

interface ButtonProps extends Apparence, ButtonHTMLAttributes<HTMLButtonElement> {
  /** Texte d'état affiché à la place du libellé pendant l'action (« Création du QR code… »).
   *  Le bouton est alors désactivé et marqué aria-busy. */
  chargement?: string | false;
}

/** L'union de variantes empêche `variante="primary"` de passer en silence. */
export function Button({ variante, taille, bloc, icone, chargement, className, type = "button", disabled, children, ...reste }: ButtonProps) {
  const occupe = Boolean(chargement);
  return (
    <button
      type={type}
      className={classes({ variante, taille, bloc }, className)}
      disabled={disabled || occupe}
      aria-busy={occupe || undefined}
      {...reste}
    >
      {!occupe && icone}
      <span className="btn__libelle">{occupe ? chargement : children}</span>
    </button>
  );
}

type LienBoutonProps = Apparence & AnchorHTMLAttributes<HTMLAnchorElement>;

/** Même apparence qu'un bouton, mais c'est une navigation : un vrai lien (retour Android, ouvrir dans un onglet). */
export function LienBouton({ variante, taille, bloc, icone, className, children, ...reste }: LienBoutonProps) {
  return (
    <a className={classes({ variante, taille, bloc }, className)} {...reste}>
      {icone}
      <span className="btn__libelle">{children}</span>
    </a>
  );
}
