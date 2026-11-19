import { lazy, Suspense } from "react";
import type { ReactNode } from "react";
import { WalletProvider } from "./lib/lightning/WalletContext";
import { useRoute } from "./lib/useRoute";
import { Coque } from "./components/layout/Coque";
import { ToastRegion } from "./components/ui";
import { Accueil } from "./pages/Accueil";
import { Declarer } from "./pages/Declarer";
import { Historique } from "./pages/Historique";
import { Paiement } from "./pages/Paiement";
import { PaiementRecu } from "./pages/PaiementRecu";
import { Passeport } from "./pages/Passeport";
import { Reglages } from "./pages/Reglages";
import { VuePreteur } from "./pages/VuePreteur";

// Page interne, jamais vue par le commerçant : chargée à la demande (budget JS §3.2).
const ApercuDesignSystem = lazy(() => import("./pages/ApercuDesignSystem"));

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

function Ecran() {
  const { chemin, param, suite } = useRoute();

  // Pages autonomes : la vue prêteur est ouverte par une autre personne
  // (agent de microfinance) qui n'a pas l'application.
  // #/preteur/<charge> (lien long) ou #/preteur/p/<id> (lien court, charge lue sur le serveur).
  if (chemin === "/preteur") return param === "p" ? <VuePreteur id={suite[1] ?? ""} /> : <VuePreteur charge={param} />;
  if (chemin === "/apercu-design-system") return <Suspense fallback={null}><ApercuDesignSystem /></Suspense>;

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
