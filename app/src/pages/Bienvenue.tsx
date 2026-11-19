import { useLayoutEffect, useState } from "react";
import { CircleCheck, Pause, Play, ReceiptText, Zap } from "lucide-react";
import { CoinFcfa } from "../components/signature/CoinFcfa";
import { RibbonBackground } from "../components/signature/RibbonBackground";
import { Button } from "../components/ui";
import { useAnimationsRiches } from "../lib/useAppareilModeste";
import { useWallet } from "../lib/lightning/WalletContext";
import { modifierPreferences, preferencesEnregistrees } from "../lib/preferences";
import { aller, remplacer } from "../lib/useRoute";

const ARGUMENTS = [
  { Icone: Zap, texte: "Paiements rapides" },
  { Icone: CircleCheck, texte: "Simple à utiliser" },
  { Icone: ReceiptText, texte: "Vos ventes réunies" },
];

/** E0 : première ouverture seulement. Pièce en boucle et rubans plein écran, avec un bouton pour
 *  les arrêter (WCAG 2.2.2 : plus de 5 s de mouvement à côté du contenu). */
export function Bienvenue() {
  const { activerDemo } = useWallet();
  const animations = useAnimationsRiches();
  const [enPause, setEnPause] = useState(false);

  // Déjà installée (retour arrière depuis l'Accueil, lien gardé) : pas de seconde bienvenue.
  useLayoutEffect(() => {
    if (preferencesEnregistrees()) remplacer("/");
  }, []);

  const essayer = () => {
    activerDemo();
    modifierPreferences({}); // la préférence est enregistrée : l'Accueil s'ouvrira directement
    remplacer("/");
  };

  return (
    <div className="bienvenue">
      <RibbonBackground variante="plein" enPause={enPause} className="bienvenue__fond" />
      {animations && (
        <button type="button" className="bienvenue__pause" onClick={() => setEnPause((p) => !p)}>
          {enPause ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}
          <span className="sr-only">{enPause ? "Relancer les animations" : "Mettre les animations en pause"}</span>
        </button>
      )}
      <div className="bienvenue__contenu">
        <CoinFcfa mode="boucle" enPause={enPause} className="bienvenue__piece" />
        <div className="bienvenue__voile">
          <h1>Votre téléphone devient votre caisse Lightning.</h1>
          <p>
            Créez un QR code, recevez vos paiements en Bitcoin et retrouvez toutes vos ventes au même endroit.
            Une caisse simple, rapide et pensée pour les petits commerces.
          </p>
          <ul className="bienvenue__arguments">
            {ARGUMENTS.map(({ Icone, texte }) => (
              <li key={texte}><Icone aria-hidden="true" />{texte}</li>
            ))}
          </ul>
          <div className="bienvenue__actions">
            <Button taille="lg" bloc onClick={() => aller("/connexion")}>Commencer</Button>
            <Button variante="discret" bloc onClick={essayer}>Essayer en mode démonstration</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
