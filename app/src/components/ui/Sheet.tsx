import { useEffect, useId, useRef } from "react";
import type { PointerEvent, ReactNode } from "react";

/** Distance (fraction de la hauteur) ou vitesse (px/ms) au-delà de laquelle un glissement ferme. */
const SEUIL_DISTANCE = 0.25;
const SEUIL_VITESSE = 0.5;

const clicExterieurNatif = typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype;

function horsDuCadre(e: PointerEvent<HTMLDialogElement>): boolean {
  const r = e.currentTarget.getBoundingClientRect();
  return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
}

interface SheetProps {
  ouvert: boolean;
  /** Appelé quand l'utilisateur ferme (Échap, retour Android, clic dehors, glissement, « Fermer »). */
  onFermer(): void;
  titre: string;
  children?: ReactNode;
  /** Boutons d'action en bas. Mettre data-autofocus sur celui qui doit recevoir le focus. */
  pied?: ReactNode;
  /** Bouton « Fermer » dans l'en-tête (masqué pour une confirmation, qui a son propre « Annuler »). */
  boutonFermer?: boolean;
}

/** Feuille du bas sur mobile, boîte centrée à partir de 768 px. Élément <dialog> natif ouvert
 *  avec showModal() : focus contenu, page inerte, Échap et retour Android, et retour du focus
 *  à l'élément d'origine sont fournis par le navigateur (aucun piège à focus maison). */
export function Sheet({ ouvert, onFermer, titre, children, pied, boutonFermer = true }: SheetProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const idTitre = useId();
  const fermeParLeParent = useRef(false);
  const glisse = useRef<{ y0: number; t0: number; dy: number } | null>(null);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (ouvert && !d.open) {
      d.setAttribute("closedby", "any");
      d.showModal();
      d.querySelector<HTMLElement>("[data-autofocus]")?.focus();
    } else if (!ouvert && d.open) {
      fermeParLeParent.current = true;
      d.close();
    }
  }, [ouvert]);

  const surFermeture = () => {
    ref.current?.style.removeProperty("transform");
    if (fermeParLeParent.current) { fermeParLeParent.current = false; return; }
    onFermer();
  };

  // Navigateurs sans closedby (Safari) : clic à l'extérieur, appui ET relâchement dehors.
  const appuiDehors = useRef(false);
  const surAppui = (e: PointerEvent<HTMLDialogElement>) => { appuiDehors.current = !clicExterieurNatif && horsDuCadre(e); };
  const surRelache = (e: PointerEvent<HTMLDialogElement>) => { if (appuiDehors.current && horsDuCadre(e)) ref.current?.close(); };

  // Glisser vers le bas pour fermer, depuis l'en-tête uniquement (le corps garde son défilement).
  const debutGlisse = (e: PointerEvent<HTMLDivElement>) => {
    if ((e.target as Element).closest("button, a") || window.matchMedia("(min-width: 768px)").matches) return;
    glisse.current = { y0: e.clientY, t0: e.timeStamp, dy: 0 };
    e.currentTarget.setPointerCapture(e.pointerId);
    ref.current?.classList.add("feuille--glisse");
  };
  const pendantGlisse = (e: PointerEvent<HTMLDivElement>) => {
    const g = glisse.current;
    if (!g || !ref.current) return;
    g.dy = Math.max(0, e.clientY - g.y0);
    ref.current.style.transform = `translateY(${g.dy}px)`;
  };
  const finGlisse = (e: PointerEvent<HTMLDivElement>) => {
    const g = glisse.current;
    const d = ref.current;
    glisse.current = null;
    if (!g || !d) return;
    d.classList.remove("feuille--glisse");
    const vitesse = g.dy / Math.max(1, e.timeStamp - g.t0);
    if (g.dy > d.offsetHeight * SEUIL_DISTANCE || vitesse > SEUIL_VITESSE) d.close();
    else d.style.removeProperty("transform");
  };

  return (
    <dialog
      ref={ref}
      className="feuille"
      aria-labelledby={idTitre}
      onClose={surFermeture}
      onPointerDown={surAppui}
      onPointerUp={surRelache}
    >
      <div
        className="feuille__entete"
        onPointerDown={debutGlisse}
        onPointerMove={pendantGlisse}
        onPointerUp={finGlisse}
        onPointerCancel={finGlisse}
      >
        <span className="feuille__poignee" aria-hidden="true" />
        <h2 id={idTitre} className="feuille__titre">{titre}</h2>
        {boutonFermer && (
          <button type="button" className="btn btn--discret btn--md feuille__fermer" onClick={() => ref.current?.close()}>
            <span className="btn__libelle">Fermer</span>
          </button>
        )}
      </div>
      {children && <div className="feuille__corps">{children}</div>}
      {pied && <div className="feuille__pied">{pied}</div>}
    </dialog>
  );
}
