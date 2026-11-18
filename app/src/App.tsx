import { WalletProvider } from "./lib/lightning/WalletContext";
import { useRoute } from "./lib/useRoute";
import { Coque } from "./components/layout/Coque";
import { Caisse } from "./pages/Caisse";
import { Declarer } from "./pages/Declarer";
import { Historique } from "./pages/Historique";
import { Passeport } from "./pages/Passeport";
import { Reglages } from "./pages/Reglages";
import { VuePreteur } from "./pages/VuePreteur";
import { ApercuDesignSystem } from "./pages/ApercuDesignSystem";

export function App() {
  const { chemin, param } = useRoute();

  // Pages sans navigation : la vue prêteur est ouverte par une autre personne
  // (agent de microfinance) qui n'a pas l'application.
  if (chemin === "/preteur") return <VuePreteur charge={param} />;
  if (chemin === "/apercu-design-system") return <ApercuDesignSystem />;

  return (
    <WalletProvider>
      <Coque chemin={chemin}>
        {chemin === "/declarer" ? <Declarer />
          : chemin === "/historique" ? <Historique />
          : chemin === "/passeport" ? <Passeport />
          : chemin === "/reglages" ? <Reglages />
          : <Caisse />}
      </Coque>
    </WalletProvider>
  );
}
