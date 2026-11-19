import { useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useAnimationsRiches, useMouvementReduit } from "../../lib/useAppareilModeste";
import { OfflineBanner } from "../ui";
import { BottomNavigation, indexOnglet } from "./BottomNavigation";
import { useBalayage } from "./useBalayage";
import type { Voisin } from "./useBalayage";

interface CoqueProps {
  chemin: string;
  /** Contenu d'une route de la coque : la page courante, et la voisine pendant un balayage. */
  rendre(chemin: string): ReactNode;
  /** Faux sur les écrans de flux (Vente déclarée…) : ni dock ni balayage. */
  navigation?: boolean;
}

/** Cadre commun des écrans du commerçant : bandeau réseau, contenu, dock de navigation. */
export function Coque({ chemin, rendre, navigation = true }: CoqueProps) {
  const page = useRef<HTMLElement>(null);
  const couche = useRef<HTMLDivElement>(null);
  const dock = useRef<HTMLElement>(null);
  const [voisin, setVoisin] = useState<Voisin | null>(null);
  const index = indexOnglet(chemin);
  const reduit = useMouvementReduit();
  const riche = useAnimationsRiches();

  // Mouvement réduit : pas de balayage (§6.2). Appareil modeste : balayage sans flou.
  useBalayage({ actif: navigation && !reduit, flou: riche, chemin, index, page, couche, dock, surVoisin: setVoisin });

  // Nouvelle route : la page arrive en haut, sans reste du glissement (avant l'affichage).
  const premiere = useRef(true);
  useLayoutEffect(() => {
    const el = page.current;
    el?.getAnimations().forEach((a) => a.cancel());
    el?.style.removeProperty("translate");
    if (premiere.current) { premiere.current = false; return; }
    window.scrollTo(0, 0);
  }, [chemin]);

  // La couche n'existe que pour le geste en cours, depuis la route courante.
  const visible = voisin?.depuis === chemin ? voisin : null;

  return (
    <div className={`coque${navigation ? "" : " coque--sans-nav"}`}>
      <OfflineBanner />
      <main ref={page} className="coque__contenu" id="contenu">{rendre(chemin)}</main>
      {visible && (
        <div
          className="coque__voisin" aria-hidden="true" inert
          style={{ top: visible.haut, left: visible.gauche, width: visible.largeur }}
        >
          <div ref={couche} className="coque__contenu" style={{ translate: `${visible.sens * visible.largeur}px 0` } as CSSProperties}>
            {rendre(visible.chemin)}
          </div>
        </div>
      )}
      {navigation && <BottomNavigation index={index} ref={dock} />}
    </div>
  );
}
