import type { ReactNode } from "react";

interface EmptyStateProps {
  titre: string;
  /** Phrase qui dit quoi faire pour remplir l'écran. */
  children?: ReactNode;
  action?: ReactNode;
  icone?: ReactNode;
}

/** État vide : une invitation à agir, pas un constat. */
export function EmptyState({ titre, children, action, icone }: EmptyStateProps) {
  return (
    <div className="vide">
      {icone && <span className="vide__icone" aria-hidden="true">{icone}</span>}
      <p className="vide__titre">{titre}</p>
      {children && <p className="vide__texte">{children}</p>}
      {action}
    </div>
  );
}
