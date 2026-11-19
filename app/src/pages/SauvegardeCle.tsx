import { useEffect, useState } from "react";
import { Alert, BoutonRetour, Button, Checkbox, Skeleton, afficherToast } from "../components/ui";
import { modifierPreferences } from "../lib/preferences";
import { preparerMots, validerMots } from "../lib/nostr/mots";
import { remplacer } from "../lib/useRoute";

type Etat = { nom: "chargement" } | { nom: "erreur" } | { nom: "pret"; mots: string[]; nouvelle: boolean };

/** E2 : 12 mots (NIP-06) d'où dérive la clé qui signe le passeport. Jamais copiés dans le
 *  presse-papiers, jamais envoyés : sans eux, un navigateur effacé fait perdre l'identité. */
export function SauvegardeCle() {
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [note, setNote] = useState(false);
  const [enCours, setEnCours] = useState(false);

  useEffect(() => {
    let actif = true;
    preparerMots().then(
      (r) => { if (actif) setEtat({ nom: "pret", ...r }); },
      () => { if (actif) setEtat({ nom: "erreur" }); },
    );
    return () => { actif = false; };
  }, []);

  const continuer = async () => {
    if (etat.nom !== "pret") return;
    setEnCours(true);
    const ok = await validerMots(etat.mots).catch(() => false);
    setEnCours(false);
    if (!ok) { setEtat({ nom: "erreur" }); return; }
    modifierPreferences({ cleSauvegardee: true });
    afficherToast("Clé sauvegardée : votre passeport est protégé.");
    remplacer("/");
  };

  return (
    <div className="flux flux--cle">
      <BoutonRetour vers="/reglages" />
      <header className="flux__entete">
        <h1>Sauvegardez votre clé</h1>
        <p>
          Ces 12 mots signent votre passeport de revenus. Notez-les sur papier. Sans eux, un téléphone perdu ou un
          navigateur effacé fait perdre votre historique de preuve.
        </p>
      </header>
      {etat.nom === "chargement" && <Skeleton forme="bloc" hauteur="15rem" />}
      {etat.nom === "erreur" && (
        <Alert niveau="erreur">Impossible de préparer vos mots sur ce téléphone. Mettez à jour votre navigateur et réessayez.</Alert>
      )}
      {etat.nom === "pret" && <GrilleMots mots={etat.mots} />}
      {etat.nom === "pret" && !etat.nouvelle && <Alert niveau="info">Ce sont les mots de votre clé actuelle.</Alert>}
      <div className="flux__actions">
        <Checkbox label="J'ai noté mes 12 mots en lieu sûr." checked={note} onChange={(e) => setNote(e.target.checked)} />
        <Button taille="lg" bloc onClick={continuer} disabled={!note || etat.nom !== "pret"} chargement={enCours && "Enregistrement…"}>
          Continuer
        </Button>
        <Button variante="discret" bloc onClick={() => remplacer("/")}>Le faire plus tard</Button>
      </div>
    </div>
  );
}

/** Grille 2 × 6, numérotée, non sélectionnable : on recopie à la main, on ne copie pas. */
function GrilleMots({ mots }: { mots: string[] }) {
  return (
    <ol className="mots mots--lecture" aria-label="Vos 12 mots, dans l'ordre">
      {mots.map((m, i) => (
        <li key={i} className="mots__mot">
          <span className="mots__numero chiffres" aria-hidden="true">{i + 1}</span>
          <span className="mots__texte">{m}</span>
        </li>
      ))}
    </ol>
  );
}
