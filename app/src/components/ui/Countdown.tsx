import { useEffect, useRef, useState } from "react";

interface CountdownProps {
  /** Expiration en secondes Unix. */
  expireLe: number;
  /** Appelé une fois, quand le compte arrive à zéro. */
  onExpire?(): void;
}

/** « Expire dans 9:42 ». Une mise à jour par seconde (pas par image), chiffres tabulaires
 *  pour que rien ne bouge. Passe en couleur d'erreur sous 60 s. role=timer : non annoncé
 *  à chaque seconde par les lecteurs d'écran. */
export function Countdown({ expireLe, onExpire }: CountdownProps) {
  const [maintenant, setMaintenant] = useState(() => Date.now());
  const rappel = useRef(onExpire);
  useEffect(() => { rappel.current = onExpire; }, [onExpire]);

  const restant = Math.max(0, Math.ceil(expireLe - maintenant / 1000));
  const fini = restant === 0;

  useEffect(() => {
    if (fini) return;
    const id = window.setInterval(() => setMaintenant(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [fini]);

  useEffect(() => { if (fini) rappel.current?.(); }, [fini]);

  const minutes = Math.floor(restant / 60);
  const secondes = String(restant % 60).padStart(2, "0");
  return (
    <p className={`compte${restant < 60 ? " compte--urgent" : ""}`} role="timer">
      Expire dans <span className="chiffres">{minutes}:{secondes}</span>
    </p>
  );
}
