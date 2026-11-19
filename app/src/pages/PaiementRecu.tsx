import { useEffect, useRef, useState } from "react";
import { AmountDisplay, Badge, Button, LienBouton } from "../components/ui";
import { useEncaissement } from "../lib/domain/encaissement";
import { formatDateHeure, formatFcfa, referenceCourte } from "../lib/domain/format";
import { usePreferences } from "../lib/preferences";
import { aller, remplacer } from "../lib/useRoute";

/** E5 : n'existe que pour une vente confirmée par le portefeuille (préimage reçue).
 *  Le montant est là dès la première image. (La pièce en mode « entrée » arrive avec l'issue #3.) */
export function PaiementRecu() {
  const { recu } = useEncaissement();
  const { satsVisibles } = usePreferences();
  const titre = useRef<HTMLHeadingElement>(null);
  const [annonce, setAnnonce] = useState("");

  useEffect(() => {
    if (!recu) { remplacer("/"); return; }
    navigator.vibrate?.(200);
    titre.current?.focus();
    // La région live existe déjà (vide) : son remplissage est annoncé par le lecteur d'écran.
    setAnnonce(`Paiement reçu avec succès ! ${formatFcfa(recu.vente.montantFcfa)}`);
  }, [recu]);

  if (!recu) return null;
  const { vente, sats } = recu;

  return (
    <div className="flux flux--recu">
      <p className="sr-only" role="status">{annonce}</p>
      <header className="flux__entete flux__entete--centre">
        <h1 ref={titre} tabIndex={-1}>Paiement reçu !</h1>
        <p>Votre vente a été confirmée avec succès.</p>
      </header>
      <AmountDisplay montant={vente.montantFcfa} sats={satsVisibles ? sats : null} taille="secondaire" />
      <div className="recu__details">
        <Badge ton="prouve">Prouvé</Badge>
        <p>{formatDateHeure(vente.ts)}</p>
        {vente.paymentHash && <p className="chiffres">Réf. {referenceCourte(vente.paymentHash)}</p>}
      </div>
      <div className="flux__actions">
        <Button taille="lg" bloc onClick={() => aller("/")}>Nouvelle vente</Button>
        <LienBouton variante="secondaire" bloc href="#/ventes">Voir l'historique</LienBouton>
      </div>
    </div>
  );
}
