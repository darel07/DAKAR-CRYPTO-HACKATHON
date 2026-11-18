import { useSyncExternalStore } from "react";

// Santé du réseau telle que le commerçant la vit : le navigateur peut se dire
// « en ligne » alors que chaque appel expire sur une 3G faible. On compte donc
// aussi les appels ratés : deux échecs de suite affichent le bandeau, jusqu'au
// prochain appel réussi.

export interface EtatReseau {
  enLigne: boolean;
  /** Hors ligne, ou deux appels ratés de suite. */
  instable: boolean;
}

let echecsConsecutifs = 0;
let etat: EtatReseau = calculer();
const abonnes = new Set<() => void>();

function calculer(): EtatReseau {
  const enLigne = typeof navigator === "undefined" ? true : navigator.onLine;
  return { enLigne, instable: !enLigne || echecsConsecutifs >= 2 };
}

function emettre() {
  const suivant = calculer();
  if (suivant.enLigne === etat.enLigne && suivant.instable === etat.instable) return;
  etat = suivant;
  abonnes.forEach((cb) => cb());
}

/** À appeler depuis lib/ quand un appel réseau échoue (délai, erreur HTTP, hors ligne). */
export function signalerEchecReseau(): void {
  echecsConsecutifs++;
  emettre();
}

/** À appeler depuis lib/ quand un appel réseau réussit. */
export function signalerSuccesReseau(): void {
  echecsConsecutifs = 0;
  emettre();
}

function abonner(cb: () => void) {
  abonnes.add(cb);
  if (abonnes.size === 1) {
    window.addEventListener("online", emettre);
    window.addEventListener("offline", emettre);
  }
  return () => {
    abonnes.delete(cb);
    if (abonnes.size === 0) {
      window.removeEventListener("online", emettre);
      window.removeEventListener("offline", emettre);
    }
  };
}

export function useReseau(): EtatReseau {
  return useSyncExternalStore(abonner, () => etat, () => etat);
}
