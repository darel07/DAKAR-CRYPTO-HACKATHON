import { useId, useRef } from "react";
import type { CSSProperties } from "react";
import { useAppareilModeste } from "../../lib/useAppareilModeste";
import { usePauseHorsEcran } from "./usePauseHorsEcran";

export type VarianteRubans = "plein" | "coin";

interface RibbonBackgroundProps {
  /** plein : tout l'écran derrière le contenu (Bienvenue), pétales ancrés en bas à droite.
   *  coin : coin haut droit de l'en-tête de l'Accueil, effacé avant les textes et le montant. */
  variante: VarianteRubans;
  /** Arrête la boucle : à relier au bouton pause de l'écran (WCAG 2.2.2). */
  enPause?: boolean;
  className?: string;
}

/** Une feuille, ancrée à l'origine (0, 0) et dressée vers le haut : bord droit bombé, crête qui
 *  s'enroule vers la gauche (le bord roulé de la référence), bord gauche qui redescend à l'ancre.
 *  Chaque ruban en est une copie tournée et réduite autour de l'ancre : un éventail de feuilles
 *  qui se recouvrent en partie, les plus petites devant. */
const PETALE = "M0 0C60-200 120-420 40-600C-10-700-150-740-250-680C-320-640-330-560-280-520C-230-560-170-560-150-500C-150-360-110-170 0 0Z";

/** Du fond vers l'avant. L'ancre est l'origine du viewBox. */
const RUBANS = [
  { rotation: -62, echelle: 1.12 },
  { rotation: -48, echelle: 1.02 },
  { rotation: -35, echelle: 0.92 },
  { rotation: -23, echelle: 0.82 },
  { rotation: -12, echelle: 0.72 },
];

/** Même fleur, deux cadrages : l'écran entier (ancre en bas à droite), ou le haut droit de la
 *  fleur, là où les crêtes s'enroulent, pour le coin de l'en-tête. */
const VIEWBOX: Record<VarianteRubans, string> = {
  plein: "-400 -860 400 860",
  coin: "-600 -530 600 172",
};
const ALIGNEMENT: Record<VarianteRubans, string> = {
  plein: "xMaxYMax slice",
  coin: "xMaxYMin slice",
};

/** Fond à rubans brillants (§6.3) : 5 pétales remplis d'un dégradé de la palette et bordés d'un
 *  liseré ambre. Plein écran (Bienvenue) : ondulation lente en boucle (16 à 24 s), à relier au
 *  bouton pause de l'écran. Coin de l'Accueil : une ondulation de 4,5 s à l'arrivée, puis immobile
 *  (l'écran reste ouvert toute la journée ; WCAG 2.2.2). Statique en mouvement réduit, en économie
 *  de données et sur appareil modeste ; figé hors écran ou onglet caché.
 *  Chaque ruban est son propre <svg>, animé en transform au niveau HTML : l'animation tourne sur
 *  le compositeur (un transform animé sur un élément interne au SVG repeint tout le dessin à
 *  chaque image). */
export function RibbonBackground({ variante, enPause = false, className }: RibbonBackgroundProps) {
  const racine = useRef<HTMLDivElement>(null);
  const simple = useAppareilModeste();
  const id = `rubans-${useId().replace(/[^\w-]/g, "")}`;

  usePauseHorsEcran(racine, !simple, enPause);

  return (
    <div
      ref={racine}
      className={`rubans rubans--${variante}${className ? ` ${className}` : ""}`}
      data-simple={simple ? "" : undefined}
      aria-hidden="true"
    >
      <div className="rubans__masque">
        {RUBANS.map(({ rotation, echelle }, i) => (
          <svg key={i} className="rubans__ruban" viewBox={VIEWBOX[variante]} preserveAspectRatio={ALIGNEMENT[variante]}>
            <defs>
              <linearGradient id={`${id}-${i}`} x1="0.6" y1="1" x2="0.35" y2="0">
                <stop offset="0" style={{ stopColor: `var(--ruban-${i + 1})` } as CSSProperties} />
                <stop offset="1" style={{ stopColor: `var(--ruban-${i + 2})` } as CSSProperties} />
              </linearGradient>
            </defs>
            <path d={PETALE} transform={`rotate(${rotation}) scale(${echelle})`} fill={`url(#${id}-${i})`} className="rubans__forme" />
          </svg>
        ))}
      </div>
    </div>
  );
}
