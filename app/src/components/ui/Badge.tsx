import type { ReactNode } from "react";

type Ton = "prouve" | "declare" | "neutre";

/** Le libellé porte toujours le sens : la couleur seule ne suffit jamais. */
export function Badge({ ton, children }: { ton: Ton; children: ReactNode }) {
  return <span className={`pastille pastille--${ton}`}>{children}</span>;
}
