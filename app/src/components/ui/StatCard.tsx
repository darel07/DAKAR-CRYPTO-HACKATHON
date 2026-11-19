export type TonStat = "neutre" | "prouve" | "declare";

interface StatCardProps {
  /** Valeur déjà formatée (« 45 500 FCFA », « 62 % »). */
  valeur: string;
  libelle: string;
  /** Ligne optionnelle sous le libellé (« 12 ventes », « +8 % sur 7 jours »). */
  variation?: string;
  ton?: TonStat;
}

/** Chiffre clé. Quand la valeur change, elle apparaît en fondu (clé React = valeur),
 *  sans défilement de chiffres. */
export function StatCard({ valeur, libelle, variation, ton = "neutre" }: StatCardProps) {
  return (
    <div className={`stat stat--${ton}`}>
      <span key={valeur} className="stat__valeur chiffres">{valeur}</span>
      <span className="stat__libelle">{libelle}</span>
      {variation && <span className="stat__variation">{variation}</span>}
    </div>
  );
}
