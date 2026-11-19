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
    // La marge est celle du fondu (scroll-padding, ui.css) : l'option choisie n'y reste jamais à moitié effacée.
    const marge = parseFloat(getComputedStyle(g).scrollPaddingInlineStart) || 0;
    const gauche = actif.offsetLeft - marge; // .segments est position: relative (ui.css)
    const droite = actif.offsetLeft + actif.offsetWidth + marge;
    if (gauche < g.scrollLeft) g.scrollLeft = gauche;
    else if (droite > g.scrollLeft + g.clientWidth) g.scrollLeft = droite - g.clientWidth;
  }, [valeur]);

  // Repli des fondus de bord sans animations liées au défilement (iOS 18 et avant) : une option
  // du bord qui n'est pas entièrement visible signale du contenu de ce côté.
  useEffect(() => {
    const g = groupe.current;
    const premier = g?.firstElementChild;
    const dernier = g?.lastElementChild;
    if (!g || !premier || !dernier || CSS.supports("animation-timeline", "scroll()")) return;
    const obs = new IntersectionObserver((entrees) => {
      for (const { target, intersectionRatio } of entrees) {
        g.toggleAttribute(target === premier ? "data-plus-debut" : "data-plus-fin", intersectionRatio < 1);
      }
    }, { root: g, threshold: 1, rootMargin: "1px" });
    obs.observe(premier);
    obs.observe(dernier);
    return () => obs.disconnect();
  }, []);

  return (
    // data-sans-balayage : un glissement horizontal sur le groupe le fait défiler, il ne change pas d'onglet.
    <div ref={groupe} className={`segments${bloc ? " segments--bloc" : ""}`} role="group" aria-label={label} data-sans-balayage="">
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
