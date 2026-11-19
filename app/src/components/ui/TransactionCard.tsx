import { formatFcfa, formatHeure } from "../../lib/domain/format";
import type { Vente } from "../../lib/domain/types";
import { Badge } from "./Badge";

/** Une vente sur une ligne : libellé, montant à droite, pastille Prouvé/Déclaré et heure.
 *  Avec `href`, toute la ligne est un lien vers le détail (retour Android compris). */
export function TransactionCard({ vente, href }: { vente: Vente; href?: string }) {
  const prouvee = vente.type === "lightning";
  const contenu = (
    <>
      <span className="transaction__libelle">{vente.libelle}</span>
      <span className="transaction__montant chiffres">{formatFcfa(vente.montantFcfa)}</span>
      <span className="transaction__meta">
        <Badge ton={prouvee ? "prouve" : "declare"}>{prouvee ? "Prouvé" : "Déclaré"}</Badge>
        <span className="chiffres">{formatHeure(vente.ts)}</span>
      </span>
    </>
  );
  return href
    ? <a className="transaction transaction--lien" href={href}>{contenu}</a>
    : <div className="transaction">{contenu}</div>;
}
