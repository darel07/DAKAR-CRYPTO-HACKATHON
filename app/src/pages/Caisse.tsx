import { useCallback, useEffect, useRef, useState } from "react";
import { CircleCheck } from "lucide-react";
import { Alert, Badge, Button, NumericKeypad, PaymentQRCode, Skeleton } from "../components/ui";
import { formatFcfa, formatNombreSimple } from "../lib/domain/format";
import { ajouterVente } from "../lib/domain/ventesStore";
import { fcfaVersSats } from "../lib/fx/taux";
import { useTaux } from "../lib/useTaux";
import { ErreurWallet } from "../lib/lightning/portefeuille";
import type { Facture } from "../lib/lightning/portefeuille";
import { useWallet } from "../lib/lightning/WalletContext";

type Phase =
  | { nom: "saisie" }
  | { nom: "creation" }
  | { nom: "attente"; facture: Facture; fcfa: number }
  | { nom: "recu"; fcfa: number }
  | { nom: "erreur"; message: string };

const MONTANT_MAX = 10_000_000;

export function Caisse() {
  const { portefeuille } = useWallet();
  const { taux, chargement } = useTaux();
  const [chiffres, setChiffres] = useState("");
  const [phase, setPhase] = useState<Phase>({ nom: "saisie" });
  const annulation = useRef<AbortController | null>(null);
  const montant = chiffres ? Number(chiffres) : 0;

  useEffect(() => () => annulation.current?.abort(), []);

  const encaisser = useCallback(async () => {
    if (!portefeuille || !taux || montant <= 0) return;
    setPhase({ nom: "creation" });
    const ctrl = new AbortController();
    annulation.current = ctrl;
    try {
      const sats = fcfaVersSats(montant, taux);
      const facture = await portefeuille.creerFacture(sats, `Vente ${formatFcfa(montant)}`);
      setPhase({ nom: "attente", facture, fcfa: montant });
      const paiement = await portefeuille.attendrePaiement(facture, ctrl.signal);
      ajouterVente({
        montantFcfa: montant, type: "lightning", libelle: "Paiement Lightning",
        facture: facture.bolt11, preimage: paiement.preimage, paymentHash: paiement.paymentHash,
      });
      setPhase({ nom: "recu", fcfa: montant });
    } catch (e) {
      if (e instanceof DOMException && e.name === "AbortError") return;
      setPhase({ nom: "erreur", message: e instanceof ErreurWallet ? e.message : "Le paiement n'a pas abouti. Réessayez." });
    }
  }, [portefeuille, taux, montant]);

  const retour = () => { annulation.current?.abort(); setChiffres(""); setPhase({ nom: "saisie" }); };

  if (phase.nom === "recu") return <Recu fcfa={phase.fcfa} onNouveau={retour} />;
  if (phase.nom === "attente") return <Attente facture={phase.facture} fcfa={phase.fcfa} onAnnuler={retour} demo={portefeuille?.mode === "demo"} />;

  return (
    <>
      <header className="page-titre">
        <h1>Caisse</h1>
        {portefeuille?.mode === "demo" && <Badge ton="declare">Mode démonstration</Badge>}
      </header>

      {!portefeuille && (
        <Alert niveau="info" titre="Connectez votre wallet pour encaisser">
          <a href="#/reglages">Aller aux réglages</a>. Vous pouvez quand même noter des ventes en espèces ou Wave.
        </Alert>
      )}
      {phase.nom === "erreur" && <Alert niveau="erreur" titre="Encaissement impossible">{phase.message}</Alert>}

      <section className="montant" aria-live="polite">
        <p className={`montant__valeur${montant ? "" : " montant__valeur--vide"}`}>{montant ? formatFcfa(montant) : "0 FCFA"}</p>
        <p className="montant__sats">
          {chargement ? <Skeleton largeur="8rem" /> : taux && montant > 0
            ? `≈ ${formatNombreSimple(fcfaVersSats(montant, taux))} sats${taux.enCache ? " (dernier cours connu)" : ""}`
            : !taux && !chargement ? "Cours indisponible : connectez-vous une fois pour le mémoriser." : ""}
        </p>
      </section>

      <NumericKeypad valeur={chiffres} onChange={setChiffres} plafond={MONTANT_MAX} />

      <div className="actions">
        <Button taille="lg" bloc onClick={encaisser} disabled={!portefeuille || !taux || montant <= 0 || phase.nom === "creation"}>
          {phase.nom === "creation" ? "Création de la facture…" : "Encaisser en Lightning"}
        </Button>
        <a className="btn btn--secondaire btn--bloc" href="#/declarer">Vente en espèces ou Wave</a>
      </div>
    </>
  );
}

function Attente({ facture, fcfa, onAnnuler, demo }: { facture: Facture; fcfa: number; onAnnuler(): void; demo: boolean }) {
  return (
    <section className="qr" aria-live="polite">
      <h1>{formatFcfa(fcfa)}</h1>
      <p>Montrez ce code au client. Il paie avec son wallet Lightning.</p>
      <PaymentQRCode facture={facture.bolt11} />
      <p><strong>En attente du paiement…</strong></p>
      {demo && <Alert niveau="info">Mode démonstration : le paiement sera simulé dans quelques secondes.</Alert>}
      <Button variante="secondaire" bloc onClick={onAnnuler}>Annuler</Button>
    </section>
  );
}

function Recu({ fcfa, onNouveau }: { fcfa: number; onNouveau(): void }) {
  useEffect(() => { navigator.vibrate?.(200); }, []);
  return (
    <section className="recu" role="status">
      <CircleCheck size={72} aria-hidden="true" />
      <h1>Paiement reçu</h1>
      <p className="recu__montant">{formatFcfa(fcfa)}</p>
      <Badge ton="prouve">Prouvé</Badge>
      <Button taille="lg" bloc onClick={onNouveau}>Nouvelle vente</Button>
    </section>
  );
}
