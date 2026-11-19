import { useEffect, useId, useRef } from "react";
import type { CSSProperties } from "react";
import { Zap } from "lucide-react";
import { useAppareilModeste } from "../../lib/useAppareilModeste";

export type ModePiece = "boucle" | "entree" | "fixe";

interface CoinFcfaProps {
  /** boucle : cycle de 4,8 s sans fin (Bienvenue). entree : arrivée en 1,25 tour puis un
   *  balancement, terminée avant 5 s (Paiement reçu). fixe : face avant immobile. */
  mode?: ModePiece;
  /** Diamètre en px. Sans valeur, la CSS décide (160 px, réduit par les écrans courts). */
  taille?: number;
  /** Arrête la boucle : à relier au bouton pause de l'écran (WCAG 2.2.2). */
  enPause?: boolean;
  className?: string;
}

const TEXTE_ANNEAU = "CAISSE LIGHTNING • DAKAR • FRANC CFA • ";
/** Tranche : un cylindre de 24 facettes. (Des disques empilés n'ont plus de surface vus
 *  exactement de profil : la pièce disparaissait au lieu de montrer sa tranche.) */
const FACETTES = Array.from({ length: 24 }, (_, n) => n);
// Repère SVG d'une pièce de 160 : liseré jusqu'au rayon 76, anneau intérieur à 82 % du diamètre.
const R_ANNEAU = 65.6;
const R_TEXTE = 67.8;

/** Anneau intérieur et texte circulaire, identiques sur les deux faces. */
function Anneau({ id }: { id: string }) {
  const r = R_TEXTE;
  return (
    <svg className="piece__anneau" viewBox="0 0 160 160">
      <path id={id} d={`M80 ${80 - r}a${r} ${r} 0 1 1 0 ${2 * r}a${r} ${r} 0 1 1 0 ${-2 * r}`} fill="none" />
      <circle cx="80" cy="80" r={R_ANNEAU} className="piece__anneau-trait" />
      <text className="piece__anneau-texte" textLength={(2 * Math.PI * r).toFixed(1)} lengthAdjust="spacing">
        <textPath href={`#${id}`}>{TEXTE_ANNEAU}</textPath>
      </text>
    </svg>
  );
}

/** Marque FCFA : « CFA » au-dessus d'un F (Plus Jakarta Sans 800) barré une seconde fois, comme ₣.
 *  En SVG, la ligne de base est connue : la barre est placée d'après les mesures du glyphe
 *  (capitale 0,75 em, fût de 0,065 à 0,22 em, barre du milieu de 0,285 à 0,42 em). */
function Marque() {
  return (
    <svg className="piece__marque" viewBox="0 0 160 160">
      <text x="81" y="57.5" textAnchor="middle" className="piece__cfa">CFA</text>
      <text x="62" y="109" className="piece__f">F</text>
      {/* 0,1 em d'épaisseur, à égale distance de la ligne de base et de la barre du milieu */}
      <rect x="60.1" y="97.05" width="23.9" height="6.2" />
    </svg>
  );
}

/** Pièce FCFA en verre qui tourne (§6.1) : deux faces et une tranche à facettes en 3D CSS.
 *  Purement décorative (aria-hidden) : l'écran dit déjà tout, et le montant ne l'attend jamais.
 *  Les boucles s'arrêtent hors écran et quand l'onglet est caché ; en mouvement réduit ou sur un
 *  appareil modeste, la face avant reste fixe avec un éclat immobile. */
export function CoinFcfa({ mode = "boucle", taille, enPause = false, className }: CoinFcfaProps) {
  const racine = useRef<HTMLDivElement>(null);
  const simple = useAppareilModeste();
  const id = `piece-${useId().replace(/[^\w-]/g, "")}`;

  // État de pause écrit dans le DOM (animation-play-state en CSS) : aucun rendu React.
  useEffect(() => {
    const el = racine.current;
    if (!el || mode === "fixe" || simple) return;
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
  }, [mode, simple, enPause]);

  const style = taille ? ({ "--piece-taille": `${taille}px` } as CSSProperties) : undefined;

  return (
    <div
      ref={racine}
      className={`piece piece--${mode}${className ? ` ${className}` : ""}`}
      data-simple={simple ? "" : undefined}
      style={style}
      aria-hidden="true"
    >
      <div className="piece__corps">
        {FACETTES.map((n) => (
          <span key={n} className="piece__facette" style={{ "--n": n } as CSSProperties} />
        ))}
        <div className="piece__face piece__face--avant">
          <Anneau id={id} />
          <Marque />
        </div>
        <div className="piece__face piece__face--arriere">
          <Anneau id={`${id}-dos`} />
          <Zap className="piece__eclair" strokeWidth={2} />
        </div>
      </div>
    </div>
  );
}
