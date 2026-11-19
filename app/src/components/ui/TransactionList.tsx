import { useMemo, useState } from "react";
import { cleJour, libelleJour } from "../../lib/domain/format";
import type { Vente } from "../../lib/domain/types";
import { Button } from "./Button";
import { TransactionCard } from "./TransactionCard";

/** Au-delà de ce nombre de ventes, on n'affiche que des tranches (téléphone modeste). */
const SEUIL = 200;
const TRANCHE = 50;

/** Regroupe des ventes déjà triées (plus récente d'abord) par jour local, ordre conservé. */
function grouperParJour(ventes: Vente[]): Vente[][] {
  const groupes = new Map<string, Vente[]>();
  for (const v of ventes) {
    const cle = cleJour(v.ts);
    const groupe = groupes.get(cle);
    if (groupe) groupe.push(v); else groupes.set(cle, [v]);
  }
  return [...groupes.values()];
}

interface TransactionListProps {
  /** Ventes triées de la plus récente à la plus ancienne. */
  ventes: Vente[];
  /** Lien vers le détail d'une vente (« #/ventes/<id> »). */
  lien?(vente: Vente): string;
  /** Vente dont le détail est affiché à côté de la liste (version ordinateur). */
  selection?: string | null;
}

/** Liste groupée par jour (« Aujourd'hui », « Hier », « lundi 16 novembre »), en-têtes collants. */
export function TransactionList({ ventes, lien, selection = null }: TransactionListProps) {
  const [limite, setLimite] = useState(TRANCHE);
  const decoupe = ventes.length > SEUIL;
  const jours = useMemo(
    () => grouperParJour(decoupe ? ventes.slice(0, limite) : ventes),
    [ventes, decoupe, limite],
  );

  return (
    <div className="transactions">
      {jours.map((groupe) => {
        const premier = groupe[0]!;
        return (
          <section key={cleJour(premier.ts)} className="transactions__jour">
            <h2 className="transactions__titre">{libelleJour(premier.ts)}</h2>
            <ul className="transactions__liste">
              {groupe.map((v) => (
                <li key={v.id}><TransactionCard vente={v} href={lien?.(v)} actif={v.id === selection} /></li>
              ))}
            </ul>
          </section>
        );
      })}
      {decoupe && limite < ventes.length && (
        <Button variante="secondaire" bloc onClick={() => setLimite((l) => l + TRANCHE)}>Afficher plus</Button>
      )}
    </div>
  );
}
