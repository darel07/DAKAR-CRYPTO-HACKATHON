import type { CSSProperties } from "react";

type Forme = "ligne" | "bloc" | "cercle";

interface SkeletonProps {
  forme?: Forme;
  /** Valeur CSS (« 60% », « 8rem ») pour imiter la forme du contenu final. */
  largeur?: string;
  hauteur?: string;
}

/** Placeholder à la forme du contenu final (pas de spinner générique).
 *  Le reflet ne bouge que si le mouvement est autorisé (voir ui.css). */
export function Skeleton({ forme = "ligne", largeur, hauteur }: SkeletonProps) {
  const style = { "--sq-l": largeur, "--sq-h": hauteur } as CSSProperties;
  return <span className={`squelette squelette--${forme}`} style={style} aria-hidden="true" />;
}
