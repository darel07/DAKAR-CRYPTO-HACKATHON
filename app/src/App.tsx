import { lazy, Suspense } from "react";
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

function Ecran() {
  const { chemin, param } = useRoute();

  // Pages autonomes : la vue prêteur est ouverte par une autre personne
  // (agent de microfinance) qui n'a pas l'application.
  if (chemin === "/preteur") return <VuePreteur charge={param} />;
  if (chemin === "/apercu-design-system") return <Suspense fallback={null}><ApercuDesignSystem /></Suspense>;

  // Écrans de flux : sans barre de navigation (§6.2).
  if (chemin === "/paiement") return <Paiement />;
  if (chemin === "/recu") return <PaiementRecu />;

  return (
    <Coque chemin={chemin}>
      {chemin === "/declarer" ? <Declarer />
        : chemin === "/ventes" || chemin === "/historique" ? <Historique />
        : chemin === "/passeport" ? <Passeport />
        : chemin === "/reglages" ? <Reglages />
        : <Accueil />}
    </Coque>
  );
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
