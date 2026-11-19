import { useEffect, useRef, useSyncExternalStore } from "react";
import { transitionner } from "./transitions";

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

// Une seule source de vérité pour la route, écoutée dès le chargement du module : tous les
// écrans changent dans la même mise à jour, ce qui permet de l'envelopper dans une View
// Transition (lib/transitions.ts). Une redirection faite au premier rendu (Bienvenue, premier
// lancement) est captée aussi, puisque l'écouteur existe avant tout rendu.
let routeActuelle = lire();
// Route quittée en dernier : un écran de flux (E6) revient à l'Accueil par history.back() s'il en
// vient (pas de doublon dans l'historique), et par remplacement sinon (un lien direct ne doit pas
// faire quitter l'application).
let routePrecedente: string | null = null;
const abonnes = new Set<() => void>();

window.addEventListener("hashchange", () => {
  const n = lire();
  if (n.chemin === routeActuelle.chemin && n.suite.join("/") === routeActuelle.suite.join("/")) return;
  const de = routeActuelle.chemin;
  transitionner(de, n.chemin, () => {
    if (n.chemin !== de) routePrecedente = de;
    routeActuelle = n;
    for (const f of abonnes) f();
  });
});

const abonner = (f: () => void) => { abonnes.add(f); return () => { abonnes.delete(f); }; };
const instantane = () => routeActuelle;

/** Routage par hash : le lien du passeport fonctionne sans serveur ni réécriture d'URL. */
export function useRoute(): Route {
  return useSyncExternalStore(abonner, instantane);
}

export const cheminPrecedent = (): string | null => routePrecedente;

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
