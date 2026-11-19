import { useEffect, useState } from "react";
import { chargerTaux, lireCache } from "./fx/taux";
import type { Taux } from "./fx/taux";

interface EtatTaux { taux: Taux | null; chargement: boolean }

/** Rafraîchissement tant que l'écran reste ouvert (un étal reste ouvert des heures). */
const RAFRAICHIR_MS = 5 * 60 * 1000;

/** Cours BTC/FCFA. Le dernier cours connu s'affiche dès la première image, puis le cours
 *  est relu au montage, toutes les 5 minutes et au retour du réseau. Annulé au démontage. */
export function useTaux(): EtatTaux {
  const [etat, setEtat] = useState<EtatTaux>(() => ({ taux: lireCache(), chargement: true }));

  useEffect(() => {
    let ctrl = new AbortController();
    const charger = () => {
      ctrl.abort();
      ctrl = new AbortController();
      const { signal } = ctrl;
      chargerTaux(signal)
        .then((taux) => { if (!signal.aborted) setEtat((e) => ({ taux: taux ?? e.taux, chargement: false })); })
        .catch(() => { if (!signal.aborted) setEtat((e) => ({ ...e, chargement: false })); });
    };
    charger();
    const minuteur = window.setInterval(charger, RAFRAICHIR_MS);
    window.addEventListener("online", charger);
    return () => {
      ctrl.abort();
      window.clearInterval(minuteur);
      window.removeEventListener("online", charger);
    };
  }, []);

  return etat;
}
