import { useSyncExternalStore } from "react";

/** Même seuil que les @media (min-width: 1024px) d'ecrans.css (version ordinateur, §7). */
const REQUETE = "(min-width: 1024px)";
const requete = typeof matchMedia === "function" ? matchMedia(REQUETE) : null;

const abonner = (f: () => void) => {
  requete?.addEventListener("change", f);
  return () => requete?.removeEventListener("change", f);
};

/** Vrai sur un écran d'ordinateur : l'historique y montre le détail à côté de la liste au lieu
 *  d'une feuille du bas. Suit le redimensionnement de la fenêtre. */
export function useEcranLarge(): boolean {
  return useSyncExternalStore(abonner, () => requete?.matches ?? false);
}
