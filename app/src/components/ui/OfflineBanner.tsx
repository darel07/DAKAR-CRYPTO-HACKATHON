import { WifiOff } from "lucide-react";
import { useReseau } from "../../lib/useReseau";

/** Bandeau fin sous l'en-tête quand le téléphone est hors ligne ou que deux appels ont
 *  échoué de suite. La région live existe toujours, pour que l'apparition soit annoncée.
 *  `visible` force l'affichage (page d'aperçu). */
export function OfflineBanner({ visible }: { visible?: boolean }) {
  const { instable } = useReseau();
  const affiche = visible ?? instable;
  return (
    <div className="bandeau-reseau-region" role="status">
      {affiche && (
        <p className="bandeau-reseau">
          <WifiOff aria-hidden="true" />
          Votre connexion Internet semble instable.
        </p>
      )}
    </div>
  );
}
