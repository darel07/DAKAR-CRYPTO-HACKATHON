import { useEffect, useRef, useState } from "react";

export interface Route {
  chemin: string;
  /** Premier segment après le chemin (« #/ventes/<id> » → id). */
  param: string | null;
  /** Tous les segments après le chemin (« #/preteur/p/<id> » → ["p", id]). */
  suite: string[];
}

function lire(): Route {
  const brut = window.location.hash.replace(/^#/, "") || "/";
  const [, premier = "", ...suite] = brut.split("/");
  return { chemin: `/${premier}`, param: suite[0] ?? null, suite };
}

/** Routage par hash : le lien du passeport fonctionne sans serveur ni réécriture d'URL. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(lire);
  useEffect(() => {
    const maj = () => setRoute((r) => {
      const n = lire();
      return n.chemin === r.chemin && n.suite.join("/") === r.suite.join("/") ? r : n;
    });
    window.addEventListener("hashchange", maj);
    // Une redirection faite au premier rendu (useLayoutEffect de Bienvenue ou du premier lancement)
    // a pu changer l'adresse avant cet abonnement : on relit l'adresse une fois abonné.
    maj();
    return () => window.removeEventListener("hashchange", maj);
  }, []);
  return route;
}

/** Nouvelle entrée d'historique (le retour Android revient à l'écran précédent). */
export const aller = (chemin: string) => { window.location.hash = chemin; };

/** Remplace l'entrée courante : le retour ne ramène pas à un écran de flux terminé. */
export const remplacer = (chemin: string) => { window.location.replace(`#${chemin}`); };

// ---- Flux d'encaissement (E3 → E4 → E5) et bouton retour ----
// Chaque écran du flux est une entrée d'historique qui porte sa profondeur (`flux`) dans
// history.state : on sait ainsi de combien d'entrées revenir pour retrouver l'Accueil,
// sans laisser derrière soi des écrans de flux terminés que le retour Android repasserait.

interface EtatFlux { flux?: number; garde?: boolean }

export const etatFlux = (): EtatFlux => (history.state ?? {}) as EtatFlux;

/** pushState / replaceState ne déclenchent pas hashchange, seul événement écouté par useRoute. */
const notifier = () => { window.dispatchEvent(new HashChangeEvent("hashchange")); };

/** E4 : ajoute une entrée « garde » à la même adresse. Le retour Android la consomme
 *  (événement popstate) au lieu de quitter l'écran : la page peut alors demander confirmation. */
export function poserGarde(): void {
  const { flux, garde } = etatFlux();
  if (garde) return;
  const base = flux ?? 1;
  history.replaceState({ flux: base }, "");
  history.pushState({ flux: base + 1, garde: true }, "");
}

/** Passe à l'écran suivant du flux (E4 → E5) sans nouvelle entrée, en gardant la profondeur. */
export function avancerDansFlux(chemin: string): void {
  history.replaceState({ flux: etatFlux().flux }, "", `#${chemin}`);
  notifier();
}

/** Termine le flux en revenant à l'entrée de l'Accueil d'où il est parti. Sans profondeur
 *  connue (adresse ouverte directement), remplace l'entrée courante par l'Accueil. */
export function sortirDuFlux(): void {
  const n = etatFlux().flux ?? 0;
  if (n > 0) history.go(-n);
  else remplacer("/");
}

/** Même chose au montage d'un écran de flux vide (rechargé, ou atteint par le retour).
 *  Différé d'une tâche : en StrictMode l'effet est joué deux fois, et deux history.go(-1)
 *  feraient sortir de l'application. */
export function useSortieSi(condition: boolean): void {
  useEffect(() => {
    if (!condition) return;
    const id = window.setTimeout(sortirDuFlux, 0);
    return () => window.clearTimeout(id);
  }, [condition]);
}

/** Tant que `actif`, le retour Android sur cet écran appelle `surRetour` au lieu de le quitter.
 *  Après un refus, l'écran rappelle poserGarde() pour intercepter le retour suivant. */
export function useGardeRetour(actif: boolean, surRetour: () => void): void {
  const rappel = useRef(surRetour);
  useEffect(() => { rappel.current = surRetour; });
  useEffect(() => {
    if (!actif) return;
    const adresse = window.location.hash;
    poserGarde();
    const surPop = () => {
      // Ignore les traversées vers un autre écran (sortie du flux, retour multiple).
      if (!etatFlux().garde && window.location.hash === adresse) rappel.current();
    };
    window.addEventListener("popstate", surPop);
    return () => window.removeEventListener("popstate", surPop);
  }, [actif]);
}
