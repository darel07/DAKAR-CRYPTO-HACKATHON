export type TonStat = "neutre" | "prouve" | "declare";

interface StatCardProps {
  /** Valeur déjà formatée, sans unité (« 45 500 », « 62 % »). */
  valeur: string;
  /** Unité en plus petit (« FCFA ») : elle passe à la ligne plutôt que de faire déborder la carte
   *  quand le montant est grand (1 250 000 sur un écran de 360 px). */
  unite?: string;
  libelle: string;
  /** Ligne optionnelle sous le libellé (« 12 ventes », « +8 % sur 7 jours »). */
  variation?: string;
  ton?: TonStat;
}

/** Chiffre clé. Quand la valeur change, elle apparaît en fondu (clé React = valeur),
 *  sans défilement de chiffres. */
export function StatCard({ valeur, unite, libelle, variation, ton = "neutre" }: StatCardProps) {
  return (
    <div className={`stat stat--${ton}`}>
      <span key={valeur} className="stat__valeur chiffres">
        {valeur}{unite && <> <span className="stat__unite">{unite}</span></>}
      </span>
      <span className="stat__libelle">{libelle}</span>
      {variation && <span className="stat__variation">{variation}</span>}
    </div>
  );
}
