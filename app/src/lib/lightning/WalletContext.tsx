import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { ErreurWallet, ouvrirDemo, ouvrirNwc } from "./portefeuille";
import type { Portefeuille } from "./portefeuille";

// Le lien NWC est un secret : il reste sur cet appareil (localStorage) et n'est
// jamais envoyé à un serveur. Compromis assumé pour le hackathon, voir le modèle de menace.
const CLE = "passeport.nwc.v1";
/** Mode démonstration choisi (E0, Réglages) : retrouvé au prochain lancement. */
const CLE_DEMO = "passeport.demo.v1";

interface Contexte {
  portefeuille: Portefeuille | null;
  connecter(url: string): void;
  /** Adopte une connexion déjà ouverte et testée (E1). */
  adopter(portefeuille: Portefeuille, url: string): void;
  activerDemo(): void;
  deconnecter(): void;
}

const Ctx = createContext<Contexte | null>(null);

function lireLien(): string | null {
  try { return localStorage.getItem(CLE); } catch { return null; }
}

function lireDemo(): boolean {
  try { return localStorage.getItem(CLE_DEMO) === "1"; } catch { return false; }
}

function ecrire(cle: string, valeur: string | null): void {
  try { if (valeur === null) localStorage.removeItem(cle); else localStorage.setItem(cle, valeur); } catch { /* ignoré */ }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [portefeuille, setPortefeuille] = useState<Portefeuille | null>(null);
  const courant = useRef<Portefeuille | null>(null);

  const remplacer = useCallback((p: Portefeuille | null) => {
    courant.current?.fermer();
    courant.current = p;
    setPortefeuille(p);
  }, []);

  useEffect(() => {
    const lien = lireLien();
    if (lien) {
      try { remplacer(ouvrirNwc(lien)); } catch { /* lien enregistré devenu invalide : on l'ignore */ }
    } else if (lireDemo()) {
      remplacer(ouvrirDemo());
    }
    return () => courant.current?.fermer();
  }, [remplacer]);

  const valeur = useMemo<Contexte>(() => ({
    portefeuille,
    connecter(url) {
      const p = ouvrirNwc(url); // lève ErreurWallet si le lien est invalide
      ecrire(CLE, url.trim());
      ecrire(CLE_DEMO, null);
      remplacer(p);
    },
    adopter(p, url) {
      ecrire(CLE, url.trim());
      ecrire(CLE_DEMO, null);
      remplacer(p);
    },
    activerDemo() {
      ecrire(CLE_DEMO, "1");
      remplacer(ouvrirDemo());
    },
    deconnecter() {
      ecrire(CLE, null);
      ecrire(CLE_DEMO, null);
      remplacer(null);
    },
  }), [portefeuille, remplacer]);

  return <Ctx.Provider value={valeur}>{children}</Ctx.Provider>;
}

export function useWallet(): Contexte {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet doit être utilisé dans un <WalletProvider>.");
  return c;
}

export { ErreurWallet };
