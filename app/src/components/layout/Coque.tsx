import type { ReactNode } from "react";
import { Gear, ListBullets, ShieldCheck, Storefront } from "@phosphor-icons/react";

const ONGLETS = [
  { chemin: "/", libelle: "Caisse", Icone: Storefront },
  { chemin: "/historique", libelle: "Ventes", Icone: ListBullets },
  { chemin: "/passeport", libelle: "Passeport", Icone: ShieldCheck },
  { chemin: "/reglages", libelle: "Réglages", Icone: Gear },
] as const;

/** Cadre commun des écrans du commerçant : contenu + barre de navigation du bas (4 entrées). */
export function Coque({ chemin, children }: { chemin: string; children: ReactNode }) {
  return (
    <div className="coque">
      <main className="coque__contenu" id="contenu">{children}</main>
      <nav className="barre" aria-label="Navigation principale">
        {ONGLETS.map(({ chemin: c, libelle, Icone }) => {
          const actif = c === chemin || (c === "/" && chemin === "/declarer");
          return (
            <a key={c} href={`#${c}`} className="barre__lien" aria-current={actif ? "page" : undefined}>
              <Icone size={26} weight={actif ? "fill" : "regular"} aria-hidden="true" />
              <span>{libelle}</span>
            </a>
          );
        })}
      </nav>
    </div>
  );
}
