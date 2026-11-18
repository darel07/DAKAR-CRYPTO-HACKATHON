import { useState } from "react";
import { Alert, Badge, Button, Field } from "../components/ui";
import { analyserVenteLocale } from "../lib/ia/analyserVente";
import { ajouterVente } from "../lib/domain/ventesStore";
import { formatFcfa } from "../lib/domain/format";
import { aller } from "../lib/useRoute";

interface Proposition { libelle: string; montant: string }

/** Une vente déclarée passe toujours par une confirmation : un montant mal compris
 *  serait une erreur d'argent. */
export function Declarer() {
  const [texte, setTexte] = useState("");
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  const analyser = () => {
    const r = analyserVenteLocale(texte);
    if (!r) { setErreur("Je n'ai pas trouvé de montant. Exemple : « 2 sacs de riz, 15 000 »."); setProposition(null); return; }
    setErreur(null);
    setProposition({ libelle: r.libelle, montant: String(r.montantFcfa) });
  };

  const montantNombre = Number(proposition?.montant);
  const montantValide = Number.isFinite(montantNombre) && montantNombre > 0 && montantNombre <= 10_000_000;

  const confirmer = () => {
    if (!proposition || !montantValide) return;
    ajouterVente({ montantFcfa: montantNombre, type: "declaree", libelle: proposition.libelle.trim().slice(0, 80) || "Vente" });
    aller("/historique");
  };

  return (
    <>
      <header className="page-titre">
        <h1>Vente en espèces ou Wave</h1>
        <p>Écrivez la vente comme vous la diriez.</p>
      </header>

      <Field label="Que s'est-il vendu ?" aide="Exemple : 2 sacs de riz, 15 000" value={texte}
        onChange={(e) => setTexte(e.target.value)} maxLength={120} autoComplete="off" erreur={erreur} />
      <Button bloc variante="secondaire" onClick={analyser} disabled={!texte.trim()}>Analyser</Button>

      {proposition && (
        <section className="rubrique" aria-live="polite">
          <Alert niveau="info" titre="Vérifiez avant d'enregistrer" />
          <Field label="Article" value={proposition.libelle} maxLength={80}
            onChange={(e) => setProposition({ ...proposition, libelle: e.target.value })} />
          <Field label="Montant en FCFA" inputMode="numeric" value={proposition.montant}
            onChange={(e) => setProposition({ ...proposition, montant: e.target.value.replace(/\D/g, "") })}
            erreur={montantValide ? null : "Entrez un montant supérieur à zéro."} />
          <p>Cette vente sera marquée <Badge ton="declare">Déclaré</Badge> : elle compte moins qu'un paiement prouvé.</p>
          <Button taille="lg" bloc onClick={confirmer} disabled={!montantValide}>
            Enregistrer {montantValide ? formatFcfa(montantNombre) : ""}
          </Button>
        </section>
      )}
    </>
  );
}
