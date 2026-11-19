import { useEffect, useRef, useState } from "react";
import { Copy } from "lucide-react";
import {
  AmountDisplay, Badge, Button, Confirmation, Countdown, PaymentQRCode, PaymentStatus, afficherToast,
} from "../components/ui";
import { abandonnerDemande, confirmerPaiement, creerDemande, useEncaissement } from "../lib/domain/encaissement";
import { ajouterVente } from "../lib/domain/ventesStore";
import { useWallet } from "../lib/lightning/WalletContext";
import { usePreferences } from "../lib/preferences";
import { copierTexte } from "../lib/pressePapiers";
import { remplacer } from "../lib/useRoute";
import { useTaux } from "../lib/useTaux";

type Etat = "attente" | "expire" | "erreur";

/** E4 : QR affiché dès que la facture existe, puis attente de la VRAIE confirmation du
 *  portefeuille. Aucun texte de succès avant que la préimage soit reçue.
 *  (Première version ; l'issue #9 ajoute l'écran maintenu allumé et la garde du bouton retour.) */
export function Paiement() {
  const { portefeuille } = useWallet();
  const { demande } = useEncaissement();
  const { taux } = useTaux();
  const { satsVisibles } = usePreferences();
  const [etat, setEtat] = useState<Etat>("attente");
  const [essai, setEssai] = useState(0);
  const [annulation, setAnnulation] = useState(false);
  const [recreation, setRecreation] = useState(false);

  // Vérifié à l'ouverture seulement : ensuite chaque sortie (succès, annulation) navigue
  // elle-même. Réagir à chaque changement de `demande` renverrait vers l'Accueil au moment
  // précis où la confirmation vide la demande, avant que la route #/recu soit prise en compte.
  const demandeInitiale = useRef(demande);
  useEffect(() => { if (!demandeInitiale.current) remplacer("/"); }, []);

  useEffect(() => {
    if (!demande || !portefeuille) return;
    const ctrl = new AbortController();
    portefeuille.attendrePaiement(demande.facture, ctrl.signal)
      .then(({ preimage, paymentHash }) => {
        if (!preimage) throw new Error("préimage absente");
        const vente = ajouterVente({
          montantFcfa: demande.montantFcfa, type: "lightning", libelle: "Paiement Lightning",
          facture: demande.facture.bolt11, preimage, paymentHash,
        });
        confirmerPaiement({ vente, sats: demande.sats });
        remplacer("/recu");
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setEtat(Date.now() / 1000 >= demande.facture.expireLe ? "expire" : "erreur");
      });
    return () => ctrl.abort();
  }, [demande, portefeuille, essai]);

  if (!demande) return null;
  const etatAffiche: Etat = portefeuille ? etat : "erreur";

  const copier = async () => {
    const ok = await copierTexte(demande.facture.bolt11);
    afficherToast(ok ? "Facture copiée" : "Copie impossible sur ce téléphone.", { niveau: ok ? "info" : "erreur" });
  };

  const recreer = async () => {
    if (!portefeuille || !taux) return;
    setRecreation(true);
    try {
      await creerDemande(portefeuille, demande.montantFcfa, taux);
      setEtat("attente");
    } catch {
      setEtat("erreur");
    } finally {
      setRecreation(false);
    }
  };

  const reessayer = () => { setEtat("attente"); setEssai((n) => n + 1); };
  /** La saisie est gardée : le commerçant retrouve son montant sur l'Accueil. */
  const quitter = () => { abandonnerDemande(); remplacer("/"); };
  const annuler = () => { setAnnulation(false); quitter(); };

  return (
    <div className="flux">
      <header className="flux__entete">
        <h1>Faire payer le client</h1>
        <p>Présentez ce QR code à votre client pour qu'il puisse payer.</p>
      </header>
      {portefeuille?.mode === "demo" && <Badge ton="ambre">Mode démonstration : le paiement sera simulé</Badge>}

      <div className="paiement__qr"><PaymentQRCode facture={demande.facture.bolt11} /></div>
      <AmountDisplay montant={demande.montantFcfa} sats={satsVisibles ? demande.sats : null} taille="secondaire" />
      {etatAffiche === "attente" && <Countdown expireLe={demande.facture.expireLe} onExpire={() => setEtat("expire")} />}
      <PaymentStatus etat={etatAffiche} debut={demande.creeLe} expireLe={demande.facture.expireLe} />

      <div className="flux__actions">
        {etatAffiche === "expire" && (
          <Button taille="lg" bloc onClick={recreer} chargement={recreation && "Création du QR code…"} disabled={!taux}>
            Créer un nouveau QR code
          </Button>
        )}
        {etatAffiche === "erreur" && portefeuille && <Button taille="lg" bloc onClick={reessayer}>Réessayer</Button>}
        {etatAffiche === "attente" && (
          <Button variante="secondaire" bloc icone={<Copy aria-hidden="true" />} onClick={copier}>Copier la facture</Button>
        )}
        <Button variante="discret" bloc onClick={() => (etatAffiche === "attente" ? setAnnulation(true) : quitter())}>
          Annuler
        </Button>
      </div>

      <Confirmation
        ouvert={annulation} titre="Annuler cette demande de paiement ?"
        confirmer="Annuler la demande" annuler="Continuer à attendre" danger
        onConfirmer={annuler} onAnnuler={() => setAnnulation(false)}
      >
        <p>Si le client a déjà payé, attendez la confirmation avant d'annuler.</p>
      </Confirmation>
    </div>
  );
}
