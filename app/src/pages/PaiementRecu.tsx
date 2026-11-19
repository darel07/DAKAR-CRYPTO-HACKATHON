import { useEffect, useRef, useState } from "react";
import { Share2 } from "lucide-react";
import { CoinFcfa } from "../components/signature/CoinFcfa";
import { AmountDisplay, Badge, Button, LienBouton, afficherToast } from "../components/ui";
import { useEncaissement } from "../lib/domain/encaissement";
import { formatDateHeure, formatFcfa, referenceCourte } from "../lib/domain/format";
import { usePreferences } from "../lib/preferences";
import { copierTexte } from "../lib/pressePapiers";
import { sortirDuFlux, useSortieSi } from "../lib/useRoute";

const dejaVu = (): boolean => Boolean((history.state as { vu?: boolean } | null)?.vu);

/** Marque l'entrée d'historique de E5 comme déjà vue : revenir sur le reçu depuis
 *  l'Historique ne refait ni vibrer le téléphone, ni annoncer un nouveau paiement,
 *  ni tourner la pièce. */
function premiereVisite(): boolean {
  if (dejaVu()) return false;
  history.replaceState({ ...(history.state ?? {}), vu: true }, "");
  return true;
}

/** E5 : n'existe que pour une vente confirmée par le portefeuille (préimage reçue et vérifiée).
 *  Le montant est là dès la première image : la pièce tourne à côté, sans rien retarder. */
export function PaiementRecu() {
  const { recu } = useEncaissement();
  const { satsVisibles } = usePreferences();
  const titre = useRef<HTMLHeadingElement>(null);
  const [annonce, setAnnonce] = useState("");
  const [revisite] = useState(dejaVu);

  // Rechargée (le reçu ne vit qu'en mémoire) : retour à l'Accueil.
  const [ouvertSansRecu] = useState(() => recu === null);
  useSortieSi(ouvertSansRecu);

  useEffect(() => {
    if (!recu) return;
    titre.current?.focus();
    if (!premiereVisite()) return;
    navigator.vibrate?.(200);
    // La région live existe déjà (vide) : son remplissage est annoncé par le lecteur d'écran.
    setAnnonce(`Paiement reçu avec succès ! ${formatFcfa(recu.vente.montantFcfa)}`);
  }, [recu]);

  if (!recu) return null;
  const { vente, sats } = recu;
  const reference = vente.paymentHash ? referenceCourte(vente.paymentHash) : null;

  const envoyerRecu = async () => {
    const texte = [
      "Reçu Caisse Lightning",
      `${formatFcfa(vente.montantFcfa)} payés le ${formatDateHeure(vente.ts)}`,
      reference && `Réf. ${reference}`,
    ].filter(Boolean).join("\n");
    if (navigator.share) {
      try { await navigator.share({ title: "Reçu Caisse Lightning", text: texte }); return; }
      catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
    }
    const ok = await copierTexte(texte);
    afficherToast(ok ? "Reçu copié : collez-le dans un message au client" : "Copie impossible sur ce téléphone.", { niveau: ok ? "info" : "erreur" });
  };

  return (
    <div className="flux flux--recu">
      <p className="sr-only" role="status">{annonce}</p>
      <CoinFcfa mode={revisite ? "fixe" : "entree"} />
      <header className="flux__entete flux__entete--centre">
        <h1 ref={titre} tabIndex={-1}>Paiement reçu !</h1>
        <p>Votre vente a été confirmée avec succès.</p>
      </header>
      <AmountDisplay montant={vente.montantFcfa} sats={satsVisibles ? sats : null} taille="secondaire" />
      <div className="recu__details">
        <Badge ton="prouve">Prouvé</Badge>
        <p>{formatDateHeure(vente.ts)}</p>
        {reference && <p className="chiffres">Réf. {reference}</p>}
      </div>
      <div className="flux__actions">
        <Button taille="lg" bloc onClick={sortirDuFlux}>Nouvelle vente</Button>
        <LienBouton variante="secondaire" bloc href="#/ventes">Voir l'historique</LienBouton>
        <Button variante="discret" bloc icone={<Share2 aria-hidden="true" />} onClick={envoyerRecu}>
          Envoyer un reçu au client
        </Button>
      </div>
    </div>
  );
}
