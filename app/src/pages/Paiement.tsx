import { useEffect, useState } from "react";
import { Copy } from "lucide-react";
import {
  AmountDisplay, Badge, Button, Confirmation, Countdown, PaymentQRCode, PaymentStatus, afficherToast,
} from "../components/ui";
import { abandonnerDemande, confirmerPaiement, creerDemande, useEncaissement } from "../lib/domain/encaissement";
import { ajouterVente } from "../lib/domain/ventesStore";
import { preimageValide } from "../lib/lightning/preuve";
import { useWallet } from "../lib/lightning/WalletContext";
import { usePreferences } from "../lib/preferences";
import { copierTexte } from "../lib/pressePapiers";
import { useEcranAllume } from "../lib/useEcranAllume";
import { avancerDansFlux, poserGarde, sortirDuFlux, useGardeRetour, useSortieSi } from "../lib/useRoute";
import { useTaux } from "../lib/useTaux";

type Etat = "attente" | "expire" | "erreur";

/** E4 : QR affiché dès que la facture existe, puis attente de la VRAIE confirmation du
 *  portefeuille. Aucun texte de succès avant une préimage reçue ET vérifiée. Pendant l'attente,
 *  l'écran reste allumé et le retour Android demande confirmation au lieu de tout perdre. */
export function Paiement() {
  const { portefeuille } = useWallet();
  const { demande } = useEncaissement();
  const { taux } = useTaux();
  const { satsVisibles } = usePreferences();
  const [etat, setEtat] = useState<Etat>("attente");
  const [essai, setEssai] = useState(0);
  const [annulation, setAnnulation] = useState(false);
  const [recreation, setRecreation] = useState(false);

  // Ouvert sans demande (rechargé après la fin du flux, ou atteint par le retour depuis E5) :
  // retour à l'Accueil. Vérifié à l'ouverture seulement, chaque sortie navigue ensuite elle-même.
  const [ouvertSansDemande] = useState(() => demande === null);
  useSortieSi(ouvertSansDemande);

  // Dernière demande affichée : l'écran reste en place pendant la traversée d'historique
  // qui suit une annulation, au lieu de clignoter à vide.
  const [affichee, setAffichee] = useState(demande);
  if (demande && demande !== affichee) setAffichee(demande);

  const etatAffiche: Etat = portefeuille ? etat : "erreur";
  useEcranAllume(!!demande && etatAffiche === "attente");

  /** La saisie est gardée : le commerçant retrouve son montant sur l'Accueil. */
  const quitter = () => { abandonnerDemande(); sortirDuFlux(); };
  useGardeRetour(!!demande, () => (etatAffiche === "attente" ? setAnnulation(true) : quitter()));

  useEffect(() => {
    if (!demande || !portefeuille) return;
    const ctrl = new AbortController();
    portefeuille.attendrePaiement(demande.facture, ctrl.signal)
      .then(({ preimage }) => {
        if (!preimageValide(preimage, demande.facture.paymentHash)) throw new Error("preuve invalide");
        const vente = ajouterVente({
          montantFcfa: demande.montantFcfa, type: "lightning", libelle: "Paiement Lightning",
          facture: demande.facture.bolt11, preimage, paymentHash: demande.facture.paymentHash,
        });
        confirmerPaiement({ vente, sats: demande.sats });
        avancerDansFlux("/recu");
      })
      .catch(() => {
        if (ctrl.signal.aborted) return;
        setEtat(Date.now() / 1000 >= demande.facture.expireLe ? "expire" : "erreur");
      });
    return () => ctrl.abort();
  }, [demande, portefeuille, essai]);

  if (!affichee) return null;

  const copier = async () => {
    const ok = await copierTexte(affichee.facture.bolt11);
    afficherToast(ok ? "Facture copiée" : "Copie impossible sur ce téléphone.", { niveau: ok ? "info" : "erreur" });
  };

  const recreer = async () => {
    if (!portefeuille || !taux) return;
    setRecreation(true);
    try {
      await creerDemande(portefeuille, affichee.montantFcfa, taux);
      setEtat("attente");
    } catch {
      setEtat("erreur");
    } finally {
      setRecreation(false);
    }
  };

  const reessayer = () => { setEtat("attente"); setEssai((n) => n + 1); };
  const annuler = () => { setAnnulation(false); quitter(); };
  const continuer = () => { setAnnulation(false); poserGarde(); };

  return (
    <div className="flux">
      <header className="flux__entete">
        <h1>Faire payer le client</h1>
        <p>Présentez ce QR code à votre client pour qu'il puisse payer.</p>
      </header>
      {portefeuille?.mode === "demo" && <Badge ton="ambre">Mode démonstration : le paiement sera simulé</Badge>}

      <div className="paiement__qr"><PaymentQRCode facture={affichee.facture.bolt11} /></div>
      <AmountDisplay montant={affichee.montantFcfa} sats={satsVisibles ? affichee.sats : null} taille="secondaire" />
      {etatAffiche === "attente" && <Countdown expireLe={affichee.facture.expireLe} onExpire={() => setEtat("expire")} />}
      <PaymentStatus etat={etatAffiche} debut={affichee.creeLe} expireLe={affichee.facture.expireLe} />

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
        onConfirmer={annuler} onAnnuler={continuer}
      >
        <p>Si le client a déjà payé, attendez la confirmation avant d'annuler.</p>
      </Confirmation>
    </div>
  );
}
