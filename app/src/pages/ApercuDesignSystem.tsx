import { useState } from "react";
import { Alert, Badge, Button, EmptyState, Field, Skeleton } from "../components/ui";

/** Contrat visuel du design system : toutes les primitives dans tous leurs états.
 *  À ouvrir (#/apercu-design-system) avant de toucher aux tokens, en clair et en sombre. */
export function ApercuDesignSystem() {
  const [texte, setTexte] = useState("");
  return (
    <div className="coque--libre">
      <h1>Aperçu du design system</h1>

      <section className="apercu-bloc"><h2>Boutons</h2>
        <Button bloc>Primaire</Button><Button variante="secondaire" bloc>Secondaire</Button>
        <Button variante="discret" bloc>Discret</Button><Button variante="danger" bloc>Danger</Button>
        <Button bloc disabled>Désactivé</Button><Button grand bloc>Grand</Button>
      </section>

      <section className="apercu-bloc"><h2>Champs</h2>
        <Field label="Normal" aide="Texte d'aide" value={texte} onChange={(e) => setTexte(e.target.value)} />
        <Field label="Avec erreur" erreur="Entrez un montant supérieur à zéro." defaultValue="0" />
      </section>

      <section className="apercu-bloc"><h2>Pastilles</h2>
        <div><Badge ton="prouve">Prouvé</Badge> <Badge ton="declare">Déclaré</Badge> <Badge ton="neutre">Neutre</Badge></div>
      </section>

      <section className="apercu-bloc"><h2>Alertes</h2>
        <Alert niveau="info" titre="Information">Un message neutre.</Alert>
        <Alert niveau="succes" titre="Succès">Quelque chose a marché.</Alert>
        <Alert niveau="erreur" titre="Erreur">Dites quoi faire pour s'en sortir.</Alert>
      </section>

      <section className="apercu-bloc"><h2>Chargement et vide</h2>
        <Skeleton hauteur="3rem" /><Skeleton largeur="60%" />
        <EmptyState titre="Aucune vente">Encaissez ou notez une vente pour commencer.</EmptyState>
      </section>
    </div>
  );
}
