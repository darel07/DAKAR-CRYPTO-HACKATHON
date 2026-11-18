import { useSyncExternalStore } from "react";

// Les animations signature (pièce, rubans, flou de la navigation) sont coupées
// ou simplifiées sur les téléphones d'entrée de gamme, en économie de données
// et en mouvement réduit (PROMPT_FRONTEND.md §6.0).

interface NavigatorEtendu extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Vrai sur un appareil modeste : 4 cœurs ou moins, 2 Go ou moins, ou économie de données. */
export function estAppareilModeste(): boolean {
  if (typeof navigator === "undefined") return false;
  const n = navigator as NavigatorEtendu;
  return (n.hardwareConcurrency ?? 8) <= 4
    || (n.deviceMemory ?? 8) <= 2
    || n.connection?.saveData === true;
}

const modeste = estAppareilModeste();
export const useAppareilModeste = (): boolean => modeste;

const requete = typeof window === "undefined" ? null : window.matchMedia("(prefers-reduced-motion: reduce)");

function abonnerMouvement(cb: () => void) {
  requete?.addEventListener("change", cb);
  return () => requete?.removeEventListener("change", cb);
}

/** Suit en direct le réglage système « réduire les animations ». */
export function useMouvementReduit(): boolean {
  return useSyncExternalStore(abonnerMouvement, () => requete?.matches ?? false, () => false);
}

/** Les boucles et le mouvement décoratif ne tournent que si les deux tests le permettent. */
export function useAnimationsRiches(): boolean {
  return !useMouvementReduit() && !modeste;
}
