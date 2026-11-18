import type { ReactNode } from "react";
import { House, ReceiptText, Settings, ShieldCheck } from "lucide-react";
import { OfflineBanner } from "../ui";

// Barre provisoire : le dock incurvé avec l'indicateur « liquid glass » arrive avec l'issue #4.
const ONGLETS = [
  { chemin: "/", libelle: "Accueil", Icone: House },
  { chemin: "/ventes", libelle: "Ventes", Icone: ReceiptText },
  { chemin: "/passeport", libelle: "Passeport", Icone: ShieldCheck },
  { chemin: "/reglages", libelle: "Réglages", Icone: Settings },
] as const;

/** Cadre commun des écrans du commerçant : bandeau réseau, contenu, barre de navigation (4 onglets). */
export function Coque({ chemin, children }: { chemin: string; children: ReactNode }) {
  return (
    <div className="coque">
      <OfflineBanner />
      <main className="coque__contenu" id="contenu">{children}</main>
      <nav className="barre" aria-label="Navigation principale">
        {ONGLETS.map(({ chemin: c, libelle, Icone }) => {
          const actif = c === chemin || (c === "/" && chemin === "/declarer");
          return (
            <a key={c} href={`#${c}`} className="barre__lien" aria-current={actif ? "page" : undefined}>
              <Icone size={24} strokeWidth={actif ? 2.25 : undefined} aria-hidden="true" />
              <span>{libelle}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
