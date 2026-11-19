import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { Mic } from "lucide-react";
import { Badge, BoutonRetour, Button, Field, Segmented, afficherToast } from "../components/ui";
import { formatFcfa } from "../lib/domain/format";
import type { MoyenVente } from "../lib/domain/types";
import { ajouterVente } from "../lib/domain/ventesStore";
import { analyserVente } from "../lib/ia/analyserVenteIa";
import type { Confiance } from "../lib/ia/analyserVenteIa";
import { cheminPrecedent, remplacer } from "../lib/useRoute";

const MOYENS = [
  { valeur: "especes", libelle: "Espèces" },
  { valeur: "wave", libelle: "Wave" },
  { valeur: "autre", libelle: "Autre" },
] as const;
const MONTANT_MAX = 10_000_000;
const SANS_MONTANT = "Je n'ai pas trouvé de montant. Exemple : 2 sacs de riz, 15 000";

interface Proposition { libelle: string; montant: string; confiance: Confiance; parIa: boolean }

/** Après l'enregistrement : retour à l'Accueil, sans doublon dans l'historique. */
function retourAccueil() {
  if (cheminPrecedent() === "/") history.back();
  else remplacer("/");
}

/** Proposition de l'analyse, toujours modifiable et toujours confirmée (une erreur d'argent coûte
 *  plus cher qu'une seconde de relecture). */
function CarteProposition({ p, onChange, onEnregistrer }: {
  p: Proposition; onChange(p: Proposition): void; onEnregistrer(montant: number): void;
}) {
  const montant = Number(p.montant);
  const valide = /^\d+$/.test(p.montant) && montant > 0 && montant <= MONTANT_MAX;
  return (
    <section className="carte declarer__proposition" aria-live="polite" aria-labelledby="titre-proposition">
      <h2 id="titre-proposition" className="carte__titre">Vérifiez avant d'enregistrer</h2>
      {!p.parIa && <p className="texte-secondaire">Analyse hors ligne</p>}
      <Field label="Article" value={p.libelle} maxLength={80} autoComplete="off" onChange={(e) => onChange({ ...p, libelle: e.target.value })} />
      <Field
        label="Montant en FCFA" inputMode="numeric" autoComplete="off" value={p.montant}
        onChange={(e) => onChange({ ...p, montant: e.target.value.replace(/[^\d]/g, "") })}
        erreur={p.montant && !valide ? "Veuillez saisir un montant valide." : null}
        aide={p.confiance === "basse" ? "Vérifiez le montant avant d'enregistrer." : undefined}
      />
      <p>Cette vente sera marquée <Badge ton="declare">Déclaré</Badge> : elle compte moins qu'un paiement prouvé.</p>
      <Button taille="lg" bloc disabled={!valide} onClick={() => onEnregistrer(montant)}>
        {valide ? `Enregistrer ${formatFcfa(montant)}` : "Enregistrer"}
      </Button>
    </section>
  );
}

/** E6 : vente hors Lightning, analysée par Claude (repli local hors connexion), puis confirmée. */
export function Declarer() {
  const [texte, setTexte] = useState("");
  const [moyen, setMoyen] = useState<MoyenVente>("especes");
  const [proposition, setProposition] = useState<Proposition | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState(false);
  const ctrl = useRef<AbortController | null>(null);
  useEffect(() => () => ctrl.current?.abort(), []);

  const analyser = async (e: FormEvent) => {
    e.preventDefault();
    if (!texte.trim()) return;
    ctrl.current?.abort(); // une nouvelle analyse remplace la précédente, jamais l'inverse
    const c = new AbortController();
    ctrl.current = c;
    setErreur(null);
    setAnalyse(true);
    try {
      const r = await analyserVente(texte, c.signal);
      if (r.moyen) setMoyen(r.moyen);
      if (r.montantFcfa === null) { setErreur(SANS_MONTANT); setProposition(null); return; }
      setProposition({ libelle: r.libelle, montant: String(r.montantFcfa), confiance: r.confiance, parIa: r.parIa });
    } catch {
      return; // annulée (nouvelle analyse ou écran quitté)
    } finally {
      if (ctrl.current === c) setAnalyse(false);
    }
  };

  const enregistrer = (montant: number) => {
    if (!proposition) return;
    ajouterVente({ montantFcfa: montant, type: "declaree", libelle: proposition.libelle.trim().slice(0, 80) || "Vente", moyen });
    afficherToast("Vente enregistrée");
    retourAccueil();
  };

  return (
    <div className="declarer">
      <BoutonRetour vers="/" />
      <header className="page-titre">
        <h1>Vente en espèces ou Wave</h1>
        <p>Écrivez la vente comme vous la diriez.</p>
      </header>
      <form className="declarer__saisie" onSubmit={analyser}>
        <div className="declarer__ligne">
          <Field label="Que s'est-il vendu ?" aide="Exemple : 2 sacs de riz, 15 000" value={texte} maxLength={120} autoComplete="off"
            onChange={(e) => { setTexte(e.target.value); setErreur(null); }} erreur={erreur} />
          {/* Bonus annoncé, pas encore branché : un vrai bouton (focusable) qui le dit, plutôt qu'une infobulle. */}
          <button type="button" className="declarer__micro" aria-disabled="true" aria-label="Dictée en wolof : bientôt"
            onClick={() => afficherToast("Bientôt : dictée en wolof")}>
            <Mic aria-hidden="true" />
          </button>
        </div>
        <Segmented label="Moyen de paiement" options={MOYENS} valeur={moyen} onChange={setMoyen} bloc />
        <Button type="submit" variante="secondaire" bloc disabled={!texte.trim()} chargement={analyse && "Analyse…"}>Analyser</Button>
      </form>
      {proposition && <CarteProposition p={proposition} onChange={setProposition} onEnregistrer={enregistrer} />}
    </div>
  );
}
