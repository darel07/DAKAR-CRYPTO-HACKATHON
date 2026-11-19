import { useLayoutEffect, useRef } from "react";
import type { Ref } from "react";
import { House, ReceiptText, Settings, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";

export const ONGLETS = [
  { chemin: "/", libelle: "Accueil", Icone: House },
  { chemin: "/ventes", libelle: "Ventes", Icone: ReceiptText },
  { chemin: "/passeport", libelle: "Passeport", Icone: ShieldCheck },
  { chemin: "/reglages", libelle: "Réglages", Icone: Settings },
] as const;

/** Onglet d'une route de la coque (l'ancienne adresse #/historique mène aux Ventes). */
export function indexOnglet(chemin: string): number {
  if (chemin === "/historique") return 1;
  const i = ONGLETS.findIndex((o) => o.chemin === chemin);
  return i < 0 ? 0 : i;
}

/** Fait rouler la pièce vers l'onglet `vers`. La pièce suit la variable continue --progression
 *  (CSS) : sa position ET sa rotation en dépendent, avec la même transition, donc elle roule sans
 *  glisser. Écrit directement dans le DOM (aucun état React) : appelée au changement de route
 *  comme au relâchement d'un balayage. */
export function deplacerIndicateur(dock: HTMLElement, vers: number): void {
  dock.dataset.actif = String(vers);
  dock.style.setProperty("--progression", String(vers));
}

interface BottomNavigationProps {
  index: number;
  ref?: Ref<HTMLElement>;
}

/** Dock flottant en verre (§6.2) : 4 onglets, et sous l'icône de l'onglet actif une pièce ambrée
 *  qui ROULE d'un onglet à l'autre (rotation = distance parcourue / rayon), pilotée par la variable
 *  continue --progression (écrite aussi par le balayage de page : la pièce roule sous le doigt).
 *  Les zones tactiles ne bougent jamais. */
export function BottomNavigation({ index, ref }: BottomNavigationProps) {
  const dock = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = dock.current;
    if (!el) return;
    // Tant que les transitions ne sont pas activées : position finale sans transition, puis
    // activation deux images plus tard. Testé sur data-pret et non sur data-actif : en StrictMode
    // l'effet est joué, nettoyé (rAF annulé) puis rejoué, et data-pret n'était jamais posé.
    if (!el.hasAttribute("data-pret")) {
      el.dataset.actif = String(index);
      el.style.setProperty("--progression", String(index));
      const id = requestAnimationFrame(() => requestAnimationFrame(() => el.setAttribute("data-pret", "")));
      return () => cancelAnimationFrame(id);
    }
    deplacerIndicateur(el, index);
  }, [index]);

  const relier = (el: HTMLElement | null) => {
    dock.current = el;
    if (typeof ref === "function") ref(el);
    else if (ref) ref.current = el;
  };

  return (
    <nav ref={relier} className="dock" aria-label="Navigation principale">
      <span className="dock__piece" aria-hidden="true" />
      {ONGLETS.map(({ chemin, libelle, Icone }, i) => (
        <a
          key={chemin}
          href={`#${chemin}`}
          className="dock__onglet"
          style={{ "--i": i } as CSSProperties}
          aria-current={i === index ? "page" : undefined}
        >
          <span className="dock__contenu">
            <Icone className="dock__icone" aria-hidden="true" />
            <span className="dock__libelle">{libelle}</span>
          </span>
        </a>
      ))}
    </nav>
  );
}
