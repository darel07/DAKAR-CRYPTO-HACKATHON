import { useEffect } from "react";

/** Garde l'écran allumé tant que `actif` est vrai (E4 : le client scanne et paie).
 *  Le navigateur relâche le verrou quand la page est masquée : il est redemandé au retour.
 *  Sans Screen Wake Lock (ou si le système refuse, batterie faible par exemple) : rien. */
export function useEcranAllume(actif: boolean): void {
  useEffect(() => {
    if (!actif || !("wakeLock" in navigator)) return;
    let verrou: WakeLockSentinel | null = null;
    let termine = false;

    const demander = async () => {
      if (verrou || document.visibilityState !== "visible") return;
      try {
        const v = await navigator.wakeLock.request("screen");
        if (termine) { void v.release(); return; }
        verrou = v;
        v.addEventListener("release", () => { if (verrou === v) verrou = null; });
      } catch { /* refusé : l'écran s'éteindra selon les réglages du téléphone */ }
    };
    const surVisibilite = () => { void demander(); };

    void demander();
    document.addEventListener("visibilitychange", surVisibilite);
    return () => {
      termine = true;
      document.removeEventListener("visibilitychange", surVisibilite);
      void verrou?.release();
      verrou = null;
    };
  }, [actif]);
}
