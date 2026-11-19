import { useMemo, useState } from "react";
import { Alert, AmountDisplay, Button, LienBouton, NumericKeypad, WalletStatus, afficherToast } from "../components/ui";
import type { EtatPortefeuille } from "../components/ui";
import { creerDemande, modifierSaisie, useEncaissement } from "../lib/domain/encaissement";
import { cleJour, formatFcfa } from "../lib/domain/format";
import { useVentes } from "../lib/domain/ventesStore";
import { fcfaVersSats } from "../lib/fx/taux";
import { useWallet } from "../lib/lightning/WalletContext";
import { usePreferences } from "../lib/preferences";
import { useReseau } from "../lib/useReseau";
import { aller } from "../lib/useRoute";
import { useTaux } from "../lib/useTaux";

const MESSAGES = {
  plafond: "Montant supérieur à votre plafond. Modifiez-le dans Réglages.",
  horsLigne: "Connexion nécessaire pour encaisser en Lightning.",
  coursIndisponible: "Cours indisponible. Connectez-vous une fois pour l'enregistrer.",
} as const;

function useVentesDuJour() {
  const ventes = useVentes();
  return useMemo(() => {
    const aujourdhui = cleJour(Date.now() / 1000);
    const du = ventes.filter((v) => cleJour(v.ts) === aujourdhui);
    return { nombre: du.length, total: du.reduce((s, v) => s + v.montantFcfa, 0) };
  }, [ventes]);
}

/** E3 : l'accueil EST la caisse. Montant, pavé et « Créer un QR code » visibles dès l'ouverture,
 *  sans défilement à 390 × 844 comme à 360 × 740. */
export function Accueil() {
  const { portefeuille } = useWallet();
  const { taux, chargement } = useTaux();
  const { enLigne } = useReseau();
  const { satsVisibles, plafondFcfa } = usePreferences();
  const { saisie } = useEncaissement();
  const jour = useVentesDuJour();
  const [creation, setCreation] = useState(false);
  const [injoignable, setInjoignable] = useState(false);
  const [plafondAtteint, setPlafondAtteint] = useState(false);

  const montant = Number(saisie || 0);
  // Une touche refusée laisse un montant valide : seul le message s'affiche. Le montant lui-même
  // ne dépasse le plafond que si celui-ci a été baissé dans Réglages après la saisie.
  const depasse = montant > plafondFcfa;
  // Le mode démonstration n'a pas besoin du réseau : il doit marcher dans une salle sans wifi.
  const reseauOk = enLigne || portefeuille?.mode === "demo";
  const peutCreer = montant > 0 && !depasse && !!portefeuille && !!taux && reseauOk && !creation;

  const etatWallet: EtatPortefeuille = !portefeuille ? "deconnecte"
    : injoignable ? "injoignable"
    : portefeuille.mode === "demo" ? "demo" : "connecte";

  const message = plafondAtteint || depasse ? MESSAGES.plafond
    : portefeuille && !reseauOk ? MESSAGES.horsLigne
    : !taux && !chargement ? MESSAGES.coursIndisponible
    : null;

  const saisir = (valeur: string) => { modifierSaisie(valeur); setPlafondAtteint(false); };

  const creer = async () => {
    if (!peutCreer || !portefeuille || !taux) return;
    setCreation(true);
    try {
      await creerDemande(portefeuille, montant, taux);
      setInjoignable(false);
      aller("/paiement");
    } catch {
      setInjoignable(true);
      setCreation(false);
      afficherToast("Impossible de contacter votre portefeuille.", { niveau: "erreur" });
    }
  };

  return (
    <div className="accueil">
      <header className="accueil__entete">
        {/* Emplacement du bandeau à rubans (RibbonBackground, issue #5). */}
        <div className="accueil__rubans" aria-hidden="true" />
        <div className="accueil__salut">
          <h1>Bonjour !</h1>
          <WalletStatus etat={etatWallet} />
        </div>
        <p className="accueil__question">Prêt à encaisser votre prochaine vente ?</p>
        {jour.nombre > 0 && (
          <p className="accueil__jour">
            Aujourd'hui : {jour.nombre} {jour.nombre > 1 ? "ventes" : "vente"} · <span className="chiffres">{formatFcfa(jour.total)}</span>
          </p>
        )}
      </header>

      {!portefeuille && (
        <Alert niveau="info" compact action={<a href="#/reglages">Connecter</a>}>
          Connectez votre portefeuille pour encaisser en Lightning.
        </Alert>
      )}

      <section className="accueil__caisse" aria-label="Caisse">
        <AmountDisplay
          libelle="Quel montant souhaitez-vous encaisser ?"
          montant={montant}
          sats={satsVisibles && taux ? (montant > 0 ? fcfaVersSats(montant, taux) : 0) : null}
          cours={taux}
          message={message}
        />
        <NumericKeypad valeur={saisie} onChange={saisir} plafond={plafondFcfa} onDepassement={() => setPlafondAtteint(true)} />
        <div className="accueil__actions">
          <Button taille="lg" bloc disabled={!peutCreer} chargement={creation && "Création du QR code…"} onClick={creer}>
            Créer un QR code
          </Button>
          <LienBouton variante="discret" bloc href="#/declarer">Vente en espèces ou Wave</LienBouton>
        </div>
      </section>
    </div>
  );
}
