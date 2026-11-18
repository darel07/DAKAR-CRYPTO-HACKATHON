import type { ReactNode } from "react";

/** État vide : dit quoi faire pour le remplir. */
export function EmptyState({ titre, children, action }: { titre: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="vide">
      <p className="vide__titre">{titre}</p>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
