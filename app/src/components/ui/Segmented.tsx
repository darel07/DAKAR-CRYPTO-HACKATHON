import { useEffect, useRef } from "react";

export interface OptionSegment<T extends string> {
  valeur: T;
  libelle: string;
}

interface SegmentedProps<T extends string> {
  /** Le type des valeurs est déduit des options seules (NoInfer), pas du setState passé. */
  options: readonly OptionSegment<T>[];
  valeur: NoInfer<T>;
  onChange(valeur: NoInfer<T>): void;
  /** Nom du groupe pour les lecteurs d'écran (« Période »). */
  label: string;
  /** Les options se partagent toute la largeur. */
  bloc?: boolean;
}

/** Groupe de boutons à bascule (aria-pressed). Défilable horizontalement s'il est trop large ;
 *  l'option choisie est ramenée dans la zone visible sans faire défiler la page. */
export function Segmented<T extends string>({ options, valeur, onChange, label, bloc }: SegmentedProps<T>) {
  const groupe = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const g = groupe.current;
    const actif = g?.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!g || !actif || g.scrollWidth <= g.clientWidth) return;
    const gauche = actif.offsetLeft; // .segments est position: relative (ui.css)
    if (gauche < g.scrollLeft) g.scrollLeft = gauche;
    else if (gauche + actif.offsetWidth > g.scrollLeft + g.clientWidth) g.scrollLeft = gauche + actif.offsetWidth - g.clientWidth;
  }, [valeur]);

  return (
    <div ref={groupe} className={`segments${bloc ? " segments--bloc" : ""}`} role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.valeur}
          type="button"
          className="segments__option"
          aria-pressed={o.valeur === valeur}
          onClick={() => onChange(o.valeur)}
        >
          {o.libelle}
        </button>
      ))}
    </div>
  );
}
