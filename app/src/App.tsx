import { lazy, Suspense, useLayoutEffect } from "react";
import type { ReactNode } from "react";
import { WalletProvider } from "./lib/lightning/WalletContext";
import { remplacer, useRoute } from "./lib/useRoute";
import { preferencesEnregistrees } from "./lib/preferences";
import { Coque } from "./components/layout/Coque";
import { ToastRegion } from "./components/ui";
import { Accueil } from "./pages/Accueil";
import { Bienvenue } from "./pages/Bienvenue";
import { Connexion } from "./pages/Connexion";
import { Declarer } from "./pages/Declarer";
import { Historique } from "./pages/Historique";
import { Paiement } from "./pages/Paiement";
import { PaiementRecu } from "./pages/PaiementRecu";
import { Passeport } from "./pages/Passeport";
import { Reglages } from "./pages/Reglages";

// Pages jamais vues par le commerçant, chargées à la demande (budget JS §3.2) : l'aperçu interne,
// et la vue prêteur avec la vérification et le décodeur de factures (seul l'agent l'ouvre).
const ApercuDesignSystem = lazy(() => import("./pages/ApercuDesignSystem"));
const VuePreteur = lazy(() => import("./pages/VuePreteur").then((m) => ({ default: m.VuePreteur })));

/** Routes de la coque (dock + balayage). Aussi utilisée pour la page voisine d'un balayage. */
function pageDeCoque(chemin: string): ReactNode {
  switch (chemin) {
    case "/declarer": return <Declarer />;
    case "/ventes": case "/historique": return <Historique />;
    case "/passeport": return <Passeport />;
    case "/reglages": return <Reglages />;
    default: return <Accueil />;
  }
}

/** Première ouverture (§7) : aucune préférence enregistrée. Un téléphone qui a déjà un
 *  portefeuille, le mode démonstration ou des ventes n'est pas renvoyé vers Bienvenue. */
function premiereOuverture(): boolean {
  if (preferencesEnregistrees()) return false;
  try {
    const ventes = localStorage.getItem("passeport.ventes.v1");
    return !localStorage.getItem("passeport.nwc.v1") && !localStorage.getItem("passeport.demo.v1") && (!ventes || ventes === "[]");
  } catch {
    return true;
  }
}

function Redirection({ vers }: { vers: string }) {
  useLayoutEffect(() => { remplacer(vers); }, [vers]);
  return null;
}

function Ecran() {
  const { chemin, param, suite } = useRoute();

  // Pages autonomes : la vue prêteur est ouverte par une autre personne
  // (agent de microfinance) qui n'a pas l'application.
  // #/preteur/<charge> (lien long) ou #/preteur/p/<id> (lien court, charge lue sur le serveur).
  if (chemin === "/preteur") {
    return (
      <Suspense fallback={null}>
        {param === "p" ? <VuePreteur id={suite[1] ?? ""} /> : <VuePreteur charge={param} />}
      </Suspense>
    );
  }
  if (chemin === "/apercu-design-system") return <Suspense fallback={null}><ApercuDesignSystem /></Suspense>;

  // Installation : Bienvenue (première ouverture) et Connexion du portefeuille, sans barre.
  if (chemin === "/bienvenue") return <Bienvenue />;
  if (chemin === "/connexion") return <Connexion />;
  if (premiereOuverture()) return <Redirection vers="/bienvenue" />;

  // Écrans de flux : sans barre de navigation (§6.2).
  if (chemin === "/paiement") return <Paiement />;
  if (chemin === "/recu") return <PaiementRecu />;

  // E6 Vente déclarée est un écran de flux : sans dock (§6.2).
  return <Coque chemin={chemin} rendre={pageDeCoque} navigation={chemin !== "/declarer"} />;
}

export function App() {
  // Le portefeuille vit au-dessus des routes : passer de l'Accueil au Paiement ne doit
  // jamais fermer la connexion (ni effacer les factures du mode démonstration).
  return (
    <WalletProvider>
      <Ecran />
      <ToastRegion />
    </WalletProvider>
  );
}
