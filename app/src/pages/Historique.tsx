import { useMemo } from "react";
import { Badge, Button, EmptyState } from "../components/ui";
import { cleJour, formatFcfa, formatHeure, formatJour } from "../lib/domain/format";
import { chargerExemple, useVentes } from "../lib/domain/ventesStore";
import type { Vente } from "../lib/domain/types";

function exporterCsv(ventes: Vente[]) {
  const lignes = ["date,montant_fcfa,type,libelle", ...ventes.map((v) =>
    `${new Date(v.ts * 1000).toISOString()},${v.montantFcfa},${v.type === "lightning" ? "prouvee" : "declaree"},"${v.libelle.replace(/"/g, '""')}"`)];
  const lien = document.createElement("a");
  lien.href = URL.createObjectURL(new Blob([lignes.join("\n")], { type: "text/csv" }));
  lien.download = "ventes.csv";
  lien.click();
  URL.revokeObjectURL(lien.href);
}

export function Historique() {
  const ventes = useVentes();
  const { prouve, declare, jours } = useMemo(() => {
    const groupes = new Map<string, Vente[]>();
    let p = 0, d = 0;
    for (const v of ventes) {
      (groupes.get(cleJour(v.ts)) ?? groupes.set(cleJour(v.ts), []).get(cleJour(v.ts))!).push(v);
      if (v.type === "lightning") p += v.montantFcfa; else d += v.montantFcfa;
    }
    return { prouve: p, declare: d, jours: [...groupes.values()] };
  }, [ventes]);

  if (ventes.length === 0) {
    return (
      <>
        <header className="page-titre"><h1>Mes ventes</h1></header>
        <EmptyState titre="Aucune vente pour l'instant"
          action={<Button variante="secondaire" onClick={chargerExemple}>Charger des données d'exemple</Button>}>
          Encaissez un paiement ou notez une vente en espèces : elle apparaîtra ici.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <header className="page-titre"><h1>Mes ventes</h1><p>{ventes.length} ventes enregistrées</p></header>
      <div className="totaux">
        <div className="total total--prouve"><span className="total__valeur">{formatFcfa(prouve)}</span><span className="total__libelle">Prouvé (Lightning)</span></div>
        <div className="total total--declare"><span className="total__valeur">{formatFcfa(declare)}</span><span className="total__libelle">Déclaré</span></div>
      </div>
      {jours.map((groupe) => (
        <section className="jour" key={cleJour(groupe[0]!.ts)}>
          <h2 className="jour__titre">{formatJour(groupe[0]!.ts)}</h2>
          {groupe.map((v) => (
            <article className="ligne" key={v.id}>
              <span>{v.libelle}</span>
              <span className="ligne__montant">{formatFcfa(v.montantFcfa)}</span>
              <span className="ligne__meta">
                <Badge ton={v.type === "lightning" ? "prouve" : "declare"}>{v.type === "lightning" ? "Prouvé" : "Déclaré"}</Badge>
                {formatHeure(v.ts)}
              </span>
            </article>
          ))}
        </section>
      ))}
      <Button variante="secondaire" bloc onClick={() => exporterCsv(ventes)}>Exporter en fichier</Button>
    </>
  );
}
