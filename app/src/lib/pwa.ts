import { afficherToast } from "../components/ui";

// PWA (§9) : service worker, mise à jour et installation.
// L'enregistrement est importé à la demande, après le chargement : workbox-window ne pèse
// rien dans le bundle de l'Accueil (budget JS §3.2) et ne retarde pas le premier affichage.

/** Événement Chrome/Android « l'application peut être installée » (non standard, non typé). */
interface InvitationInstallation extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const CLE_PROPOSEE = "caisse.installation.proposee.v1";
let invitation: InvitationInstallation | null = null;

export const estInstallee = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches
  || (navigator as Navigator & { standalone?: boolean }).standalone === true;

/** iPhone et iPad : pas d'invitation automatique, il faut passer par le menu Partager de Safari. */
export const estIos = (): boolean =>
  /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

export const peutInstaller = (): boolean => invitation !== null;

export const CONSIGNE_IOS = "Pour installer : touchez Partager, puis « Sur l'écran d'accueil ».";

/** Ouvre l'invitation du navigateur. Vrai si le commerçant a accepté. */
export async function installer(): Promise<boolean> {
  if (!invitation) return false;
  const i = invitation;
  invitation = null; // une invitation ne sert qu'une fois
  await i.prompt();
  return (await i.userChoice).outcome === "accepted";
}

function dejaProposee(): boolean {
  try { return localStorage.getItem(CLE_PROPOSEE) === "1"; } catch { return true; }
}

/** Après la 2e vente (§9), une seule fois : toast « Installer » (Android) ou consigne (iOS).
 *  Un toast plutôt qu'une carte : l'Accueil doit tenir sans défilement à 360 × 640. */
export function proposerInstallation(nbVentes: number): void {
  if (nbVentes < 2 || estInstallee() || dejaProposee() || (!peutInstaller() && !estIos())) return;
  try { localStorage.setItem(CLE_PROPOSEE, "1"); } catch { /* proposé une fois par session */ }
  if (estIos()) { afficherToast(CONSIGNE_IOS, { duree: 10_000 }); return; }
  afficherToast("Installez la caisse sur l'écran d'accueil.", {
    duree: 10_000,
    action: { libelle: "Installer", onClick: () => void installer() },
  });
}

/** À appeler une fois, au démarrage. */
export function demarrerPwa(): void {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // on choisit le moment : après la 2e vente, pas à la première visite
    invitation = e as InvitationInstallation;
  });
  if (import.meta.env.DEV || !("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void import("virtual:pwa-register").then(({ registerSW }) => {
      const mettreAJour = registerSW({
        onNeedRefresh() {
          afficherToast("Une nouvelle version est disponible.", {
            duree: null,
            action: { libelle: "Mettre à jour", onClick: () => void mettreAJour(true) },
          });
        },
      });
    });
  });
}
