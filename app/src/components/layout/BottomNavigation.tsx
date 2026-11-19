import { useLayoutEffect, useRef } from "react";
import type { Ref } from "react";
import { House, ReceiptText, Settings, ShieldCheck } from "lucide-react";
import type { CSSProperties } from "react";
import { dureeJeton } from "../../lib/animation";

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

const minuteurs = new WeakMap<HTMLElement, number>();

/** Déplace la pastille vers l'onglet `vers`. Ses deux bords sont deux transitions CSS de durées
 *  différentes (bord avant 220 ms, bord arrière 380 ms en ressort) : pendant le trajet elle
 *  s'étire en capsule sur les onglets traversés, puis se reforme. Écrit directement dans le DOM
 *  (aucun état React) : appelée au changement de route comme au relâchement d'un balayage. */
export function deplacerIndicateur(dock: HTMLElement, vers: number): void {
  const de = Number(dock.dataset.actif ?? vers);
  dock.dataset.actif = String(vers);
  dock.style.setProperty("--progression", String(vers));
  if (de === vers) return;

  dock.dataset.sens = vers > de ? "droite" : "gauche";
  dock.style.setProperty("--ind", String(vers));

  const pastille = dock.querySelector<HTMLElement>(".dock__indicateur");
  const etirement = dureeJeton("--d-etirement");
  if (pastille && etirement > 0) {
    pastille.animate(
      [{ scale: "1 1" }, { scale: "1 1.07", offset: 0.3 }, { scale: "1 1" }],
      { duration: etirement, easing: "ease-out" },
    );
  }

  // Les onglets que la capsule recouvre (dont celui qu'elle quitte) prennent la teinte ambre foncé.
  const onglets = dock.querySelectorAll<HTMLElement>(".dock__onglet");
  const [min, max] = de < vers ? [de, vers - 1] : [vers + 1, de];
  onglets.forEach((o, i) => o.toggleAttribute("data-recouvert", i >= min && i <= max));
  window.clearTimeout(minuteurs.get(dock));
  minuteurs.set(dock, window.setTimeout(
    () => onglets.forEach((o) => o.removeAttribute("data-recouvert")),
    dureeJeton("--d-bord-arriere") + dureeJeton("--d-bord-retard"),
  ));
}

interface BottomNavigationProps {
  index: number;
  ref?: Ref<HTMLElement>;
}

/** Dock flottant en verre (§6.2) : 4 onglets, pastille « liquid glass » ambre, icônes posées sur
 *  un arc piloté par la variable continue --progression (écrite par le balayage de page).
 *  Les zones tactiles ne bougent jamais : seul le contenu de chaque onglet se transforme. */
export function BottomNavigation({ index, ref }: BottomNavigationProps) {
  const dock = useRef<HTMLElement | null>(null);

  useLayoutEffect(() => {
    const el = dock.current;
    if (!el) return;
    if (el.dataset.actif === undefined) {
      // Première image : position finale sans transition, puis les transitions sont activées.
      el.dataset.actif = String(index);
      el.style.setProperty("--ind", String(index));
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
      <span className="dock__indicateur" aria-hidden="true" />
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
