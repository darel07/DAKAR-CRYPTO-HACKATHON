import type { ReactNode } from "react";
import { CircleAlert, CircleCheck, Info, TriangleAlert } from "lucide-react";

export type NiveauAlerte = "info" | "succes" | "attention" | "erreur";

const ICONES = { info: Info, succes: CircleCheck, attention: TriangleAlert, erreur: CircleAlert } as const;

interface AlertProps {
  niveau: NiveauAlerte;
  titre?: string;
  children?: ReactNode;
  /** Lien ou bouton discret qui dit quoi faire (« Connecter », « Réessayer »). */
  action?: ReactNode;
}

/** Bandeau dans le flux de la page. Les erreurs sont annoncées (role=alert), le reste poliment. */
export function Alert({ niveau, titre, children, action }: AlertProps) {
  const Icone = ICONES[niveau];
  return (
    <div className={`alerte alerte--${niveau}`} role={niveau === "erreur" ? "alert" : "status"}>
      <Icone className="alerte__icone" aria-hidden="true" />
      <div className="alerte__corps">
        {titre && <strong className="alerte__titre">{titre}</strong>}
        {children && <div>{children}</div>}
        {action && <div className="alerte__action">{action}</div>}
      </div>
    </div>
  );
}
