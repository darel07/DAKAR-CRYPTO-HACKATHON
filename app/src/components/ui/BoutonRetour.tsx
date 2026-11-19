import { ChevronLeft } from "lucide-react";
import { cheminPrecedent, remplacer } from "../../lib/useRoute";

/** Retour en haut à gauche des écrans sans barre de navigation (E1, E6). Indispensable sur
 *  iPhone : une application installée n'y a pas de bouton retour système, et le commerçant
 *  resterait bloqué. Écran ouvert directement (lien, rechargement) : on remplace par `vers`. */
export function BoutonRetour({ vers }: { vers: string }) {
  const retour = () => (cheminPrecedent() !== null ? history.back() : remplacer(vers));
  return (
    <button type="button" className="retour" onClick={retour}>
      <ChevronLeft aria-hidden="true" />
      Retour
    </button>
  );
}
