import { lazy, Suspense } from "react";
import { WalletProvider } from "./lib/lightning/WalletContext";
import { useRoute } from "./lib/useRoute";
import { Coque } from "./components/layout/Coque";
import { ToastRegion } from "./components/ui";
import { Caisse } from "./pages/Caisse";
import { Declarer } from "./pages/Declarer";
import { Historique } from "./pages/Historique";
import { Passeport } from "./pages/Passeport";
import { Reglages } from "./pages/Reglages";
import { VuePreteur } from "./pages/VuePreteur";

// Page interne, jamais vue par le commerçant : chargée à la demande (budget JS §3.2).
const ApercuDesignSystem = lazy(() => import("./pages/ApercuDesignSystem"));

function Ecran() {
  const { chemin, param } = useRoute();

  // Pages sans navigation : la vue prêteur est ouverte par une autre personne
  // (agent de microfinance) qui n'a pas l'application.
  if (chemin === "/preteur") return <VuePreteur charge={param} />;
  if (chemin === "/apercu-design-system") return <Suspense fallback={null}><ApercuDesignSystem /></Suspense>;

  return (
    <WalletProvider>
      <Coque chemin={chemin}>
        {chemin === "/declarer" ? <Declarer />
          : chemin === "/ventes" || chemin === "/historique" ? <Historique />
          : chemin === "/passeport" ? <Passeport />
          : chemin === "/reglages" ? <Reglages />
          : <Caisse />}
      </Coque>
    </WalletProvider>
  );
}

export function App() {
  return (
    <>
      <Ecran />
      <ToastRegion />
    </>
  );
}
