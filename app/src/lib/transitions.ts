import { flushSync } from "react-dom";

/** caisse : l'écran de caisse de l'Accueil devient le ticket du QR (E3 ↔ E4, dans les deux sens).
 *  succes : le montant rejoint le reçu, le vert jaillit du QR payé (E4 → E5). */
type TypeTransition = "caisse" | "succes";

function typeDe(de: string, vers: string): TypeTransition | null {
  if ((de === "/" && vers === "/paiement") || (de === "/paiement" && vers === "/")) return "caisse";
  if (de === "/paiement" && vers === "/recu") return "succes";
  // Toute autre navigation change d'écran sec : le balayage du dock a sa propre animation.
  return null;
}

/** Origine du vert : le centre du QR que le client vient de payer. À cet endroit le reçu montre
 *  son fond vert à toutes les tailles (sous l'anneau d'attente, c'était le bouton « Nouvelle
 *  vente » : la première tache visible était ambre). Rayon : jusqu'au coin le plus éloigné. */
function poserOrigineSucces(racine: HTMLElement): void {
  const r = document.querySelector(".paiement__ticket .qr-code")?.getBoundingClientRect();
  const x = r ? r.left + r.width / 2 : innerWidth / 2;
  const y = r ? r.top + r.height / 2 : innerHeight / 2;
  const rayon = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  racine.style.setProperty("--vt-x", `${Math.round(x)}px`);
  racine.style.setProperty("--vt-y", `${Math.round(y)}px`);
  racine.style.setProperty("--vt-rayon", `${Math.ceil(rayon)}px`);
}

let jeton = 0;

/** Applique un changement de route, dans une View Transition quand le parcours d'encaissement
 *  en prévoit une. Le CSS (ecrans.css, « Transitions du parcours ») ne nomme les éléments
 *  partagés que pendant la transition (`data-vt` sur <html>) et hors mouvement réduit.
 *  Sans l'API (iOS 17, anciens Android) : changement immédiat, comme avant. */
export function transitionner(de: string, vers: string, appliquer: () => void): void {
  const type = typeDe(de, vers);
  if (!type || typeof document.startViewTransition !== "function" || document.visibilityState !== "visible") {
    appliquer();
    return;
  }
  const racine = document.documentElement;
  if (type === "succes") poserOrigineSucces(racine);
  const mien = ++jeton;
  racine.dataset.vt = type;
  // flushSync : React doit avoir écrit le nouvel écran quand le rappel rend la main, sinon le
  // navigateur capture l'ancien état comme nouvel état et rien ne s'anime.
  const t = document.startViewTransition(() => flushSync(appliquer));
  // Une transition sautée (une autre commence) rejette `ready` : cas normal, pas une erreur.
  t.ready.catch(() => undefined);
  void t.finished.finally(() => { if (jeton === mien) delete racine.dataset.vt; });
}
