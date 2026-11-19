export type EtatPortefeuille = "connecte" | "demo" | "deconnecte" | "injoignable";

const TEXTES: Record<EtatPortefeuille, string> = {
  connecte: "Portefeuille connecté",
  demo: "Mode démonstration",
  deconnecte: "Portefeuille non connecté",
  injoignable: "Impossible de contacter votre portefeuille",
};

/** Pastille compacte point + texte. Le point est sémantique (seule exception à la règle
 *  « pas de points décoratifs ») et toujours doublé du texte. Déconnecté = lien vers Réglages. */
export function WalletStatus({ etat }: { etat: EtatPortefeuille }) {
  const contenu = (
    <>
      <span className="statut-wallet__point" aria-hidden="true" />
      {TEXTES[etat]}
    </>
  );
  if (etat === "deconnecte") {
    return <a href="#/reglages" className="statut-wallet statut-wallet--deconnecte">{contenu}</a>;
  }
  return <span className={`statut-wallet statut-wallet--${etat}`}>{contenu}</span>;
}
