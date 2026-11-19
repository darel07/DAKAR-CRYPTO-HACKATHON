import { useEffect } from "react";
import type { RefObject } from "react";

/** Fige les boucles d'une animation signature (§6.0) : pose `data-pause` sur l'élément quand il
 *  sort de l'écran, quand l'onglet est caché ou quand l'écran le demande (bouton pause, WCAG 2.2.2).
 *  La CSS en fait `animation-play-state: paused`. Écrit dans le DOM : aucun rendu React. */
export function usePauseHorsEcran(element: RefObject<HTMLElement | null>, actif: boolean, enPause: boolean): void {
  useEffect(() => {
    const el = element.current;
    if (!el || !actif) return;
    let horsEcran = false;
    const appliquer = () => { el.toggleAttribute("data-pause", enPause || document.hidden || horsEcran); };
    const observateur = new IntersectionObserver(([entree]) => {
      horsEcran = !entree.isIntersecting;
      appliquer();
    });
    observateur.observe(el);
    document.addEventListener("visibilitychange", appliquer);
    appliquer();
    return () => {
      observateur.disconnect();
      document.removeEventListener("visibilitychange", appliquer);
      el.removeAttribute("data-pause");
    };
  }, [element, actif, enPause]);
}
