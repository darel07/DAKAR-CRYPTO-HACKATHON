import type { ReactNode } from "react";

export type TonBadge = "prouve" | "declare" | "neutre" | "ambre";

/** Le libellé porte toujours le sens : la couleur seule ne suffit jamais. */
export function Badge({ ton, icone, children }: { ton: TonBadge; icone?: ReactNode; children: ReactNode }) {
  return <span className={`pastille pastille--${ton}`}>{icone}{children}</span>;
}
