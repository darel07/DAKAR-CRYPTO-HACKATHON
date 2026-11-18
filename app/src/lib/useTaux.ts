import { useEffect, useState } from "react";
import { chargerTaux } from "./fx/taux";
import type { Taux } from "./fx/taux";

interface EtatTaux { taux: Taux | null; chargement: boolean }

/** Lit le cours une fois au montage ; annulé au démontage pour ne pas écraser un état périmé. */
export function useTaux(): EtatTaux {
  const [etat, setEtat] = useState<EtatTaux>({ taux: null, chargement: true });
  useEffect(() => {
    const ctrl = new AbortController();
    chargerTaux(ctrl.signal)
      .then((taux) => setEtat({ taux, chargement: false }))
      .catch((e) => { if (!(e instanceof DOMException && e.name === "AbortError")) setEtat({ taux: null, chargement: false }); });
    return () => ctrl.abort();
  }, []);
  return etat;
}
