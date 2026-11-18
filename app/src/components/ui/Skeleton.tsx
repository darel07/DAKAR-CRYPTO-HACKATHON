/** Placeholder de chargement à la forme du contenu final (pas de spinner générique). */
export function Skeleton({ largeur = "100%", hauteur = "1.25rem" }: { largeur?: string; hauteur?: string }) {
  return <span className="squelette" style={{ width: largeur, minHeight: hauteur }} aria-hidden="true" />;
}
