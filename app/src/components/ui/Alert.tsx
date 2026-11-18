import type { ReactNode } from "react";

type Niveau = "erreur" | "info" | "succes";

/** Les erreurs sont annoncées aux lecteurs d'écran (role=alert), le reste poliment. */
export function Alert({ niveau, titre, children }: { niveau: Niveau; titre?: string; children?: ReactNode }) {
  return (
    <div className={`alerte alerte--${niveau}`} role={niveau === "erreur" ? "alert" : "status"}>
      {titre && <strong className="alerte__titre">{titre}</strong>}
      {children && <div>{children}</div>}
    </div>
  );
}
