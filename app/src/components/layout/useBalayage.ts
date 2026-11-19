import { useEffect } from "react";
import type { RefObject } from "react";
import { dureeJeton, lireJeton } from "../../lib/animation";
import { aller } from "../../lib/useRoute";
import { deplacerIndicateur, ONGLETS, ROUE_GAIN, tournerRoue } from "./BottomNavigation";

/** Page voisine affichée pendant un balayage, à côté de la page courante. */
export interface Voisin {
  /** Route depuis laquelle le geste a commencé : la couche disparaît dès que la route change. */
  depuis: string;
  chemin: string;
  /** +1 : onglet suivant (doigt vers la gauche) ; -1 : onglet précédent. */
  sens: 1 | -1;
  haut: number;
  gauche: number;
  largeur: number;
}

const SEUIL_DEPART = 10;                 // px avant de décider de l'axe
const ANGLE_MAX = (30 * Math.PI) / 180;  // au-delà de 30° de l'horizontale : défilement vertical
const SEUIL_DISTANCE = 0.25;             // part de la largeur pour changer d'onglet
const SEUIL_VITESSE = 0.5;               // px/ms
const RESISTANCE = 0.3;                  // premier ou dernier onglet : la page résiste
const FLOU_MAX = 2.5;                    // px
const BLOCAGE_CLIC_MS = 400;

/** Éléments où un glissement horizontal a déjà un sens (saisie, feuille ouverte…). */
const IGNORES = "input, textarea, select, dialog, [data-sans-balayage]";

interface Options {
  actif: boolean;
  flou: boolean;
  chemin: string;
  index: number;
  page: RefObject<HTMLElement | null>;
  couche: RefObject<HTMLElement | null>;
  dock: RefObject<HTMLElement | null>;
  surVoisin(voisin: Voisin | null): void;
}

interface Geste {
  id: number;
  x0: number;
  y0: number;
  horizontal: boolean;
  dx: number;
  sens: 1 | -1;
  voisin: string | null;
  largeur: number;
  vx: number;
  t: number;
  x: number;
  image: number;
}

/** Balayage horizontal entre les onglets, sur le contenu de la page (pas sur la barre).
 *  Pendant le geste, la page suit le doigt, la voisine entre par le côté et l'arc du dock suit
 *  (--progression). Tout est écrit dans le DOM à chaque image (requestAnimationFrame), jamais
 *  dans un état React : un seul setState par geste, pour monter la page voisine. */
export function useBalayage({ actif, flou, chemin, index, page, couche, dock, surVoisin }: Options): void {
  useEffect(() => {
    const el = page.current;
    if (!el || !actif) return;
    let g: Geste | null = null;
    let enAnimation = false;
    let bloquerClicJusqua = 0;

    const dessiner = () => {
      if (!g) return;
      g.image = 0;
      el.style.translate = `${g.dx}px 0`;
      if (couche.current) couche.current.style.translate = `${g.sens * g.largeur + g.dx}px 0`;
      const d = dock.current;
      if (d) {
        d.style.setProperty("--progression", String(index - g.dx / g.largeur));
        if (flou) d.style.setProperty("--flou", `${Math.min(Math.abs(g.vx) * 2, FLOU_MAX)}px`);
        // Roue : vitesse de --progression en onglets/s (le doigt vers la gauche fait avancer).
        const vitesse = (-g.vx / g.largeur) * 1000 * (g.voisin ? 1 : RESISTANCE);
        tournerRoue(d, vitesse * ROUE_GAIN);
      }
    };

    const relacher = async (geste: Geste, annule: boolean) => {
      cancelAnimationFrame(geste.image);
      bloquerClicJusqua = performance.now() + BLOCAGE_CLIC_MS;
      enAnimation = true;
      const passe = !annule && geste.voisin !== null
        && (Math.abs(geste.dx) > geste.largeur * SEUIL_DISTANCE || -geste.sens * geste.vx > SEUIL_VITESSE);
      const fin = passe ? -geste.sens * geste.largeur : 0;
      const options: KeyframeAnimationOptions = { duration: dureeJeton("--d-glisse"), easing: lireJeton("--ease-ressort") || "ease-out", fill: "forwards" };

      const d = dock.current;
      if (d) {
        // L'arc et la pastille rejoignent leur place en même temps que la page (transitions CSS).
        d.removeAttribute("data-glisse");
        d.style.setProperty("--flou", "0px");
        d.style.setProperty("--rotation-roue", "0deg"); // la roue s'arrête : retour à 0 avec le ressort
        if (passe) deplacerIndicateur(d, index + geste.sens, { impulsion: false });
        else d.style.setProperty("--progression", String(index));
      }
      el.removeAttribute("data-glisse");
      const animations = [el.animate([{ translate: `${geste.dx}px 0` }, { translate: `${fin}px 0` }], options)];
      const voisine = couche.current;
      if (voisine) {
        animations.push(voisine.animate(
          [{ translate: `${geste.sens * geste.largeur + geste.dx}px 0` }, { translate: `${geste.sens * geste.largeur + fin}px 0` }],
          options,
        ));
      }
      el.style.translate = "";
      await Promise.all(animations.map((a) => a.finished)).catch(() => undefined);
      enAnimation = false;
      if (passe && geste.voisin) {
        aller(geste.voisin); // la coque annule les animations au changement de route, avant l'affichage
      } else {
        animations.forEach((a) => a.cancel());
        surVoisin(null);
      }
    };

    const appui = (e: PointerEvent) => {
      if (g || enAnimation || !e.isPrimary || e.button !== 0 || e.pointerType === "mouse") return;
      if (e.target instanceof Element && e.target.closest(IGNORES)) return;
      if (document.querySelector("dialog[open]")) return;
      g = {
        id: e.pointerId, x0: e.clientX, y0: e.clientY, horizontal: false, dx: 0, sens: 1, voisin: null,
        largeur: 1, vx: 0, t: e.timeStamp, x: e.clientX, image: 0,
      };
    };

    const mouvement = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.id) return;
      const dx = e.clientX - g.x0;
      const dy = e.clientY - g.y0;
      if (!g.horizontal) {
        if (Math.hypot(dx, dy) < SEUIL_DEPART) return;
        if (Math.atan2(Math.abs(dy), Math.abs(dx)) > ANGLE_MAX) { g = null; return; } // défilement vertical
        g.horizontal = true;
        g.sens = dx < 0 ? 1 : -1;
        g.voisin = ONGLETS[index + g.sens]?.chemin ?? null;
        const r = el.getBoundingClientRect();
        g.largeur = r.width;
        el.setPointerCapture(e.pointerId);
        el.setAttribute("data-glisse", "");
        dock.current?.setAttribute("data-glisse", "");
        if (g.voisin) {
          surVoisin({ depuis: chemin, chemin: g.voisin, sens: g.sens, haut: Math.max(0, r.top), gauche: r.left, largeur: r.width });
        }
      }
      const dt = e.timeStamp - g.t;
      if (dt > 0) {
        g.vx = 0.8 * ((e.clientX - g.x) / dt) + 0.2 * g.vx;
        g.t = e.timeStamp;
        g.x = e.clientX;
      }
      // Sens verrouillé au départ ; sans page voisine (premier ou dernier onglet), la page résiste.
      let suivi = g.sens > 0 ? Math.min(dx, 0) : Math.max(dx, 0);
      if (!g.voisin) suivi *= RESISTANCE;
      g.dx = suivi;
      if (!g.image) g.image = requestAnimationFrame(dessiner);
    };

    const fin = (e: PointerEvent) => {
      if (!g || e.pointerId !== g.id) return;
      // Prendre la capture la retire à l'élément touché (capture implicite du tactile) :
      // ce lostpointercapture-là remonte jusqu'ici et ne termine pas le geste.
      if (e.type === "lostpointercapture" && e.target !== el) return;
      const geste = g;
      g = null;
      if (geste.horizontal) void relacher(geste, e.type !== "pointerup");
    };

    // Après un balayage, le « clic » de fin de geste ne doit pas taper une touche du pavé.
    const clic = (e: MouseEvent) => {
      if (performance.now() < bloquerClicJusqua) { e.preventDefault(); e.stopPropagation(); }
    };

    el.addEventListener("pointerdown", appui);
    el.addEventListener("pointermove", mouvement);
    el.addEventListener("pointerup", fin);
    el.addEventListener("pointercancel", fin);
    el.addEventListener("lostpointercapture", fin);
    el.addEventListener("click", clic, true);
    return () => {
      el.removeEventListener("pointerdown", appui);
      el.removeEventListener("pointermove", mouvement);
      el.removeEventListener("pointerup", fin);
      el.removeEventListener("pointercancel", fin);
      el.removeEventListener("lostpointercapture", fin);
      el.removeEventListener("click", clic, true);
      if (g) cancelAnimationFrame(g.image);
    };
  }, [actif, flou, chemin, index, page, couche, dock, surVoisin]);
}
