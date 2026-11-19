import { useEffect, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import { Alert, Button, QrCode, Sheet, Skeleton, afficherToast } from "../ui";
import type { Vente } from "../../lib/domain/types";
import { deposerRecu, lienRecu } from "../../lib/nostr/recu";
import { copierTexte } from "../../lib/pressePapiers";

type Etat = { nom: "depot" } | { nom: "pret"; url: string } | { nom: "erreur" };

interface FeuilleRecuProps {
  vente: Vente;
  ouvert: boolean;
  onFermer(): void;
  /** Repli sans serveur : reçu en texte simple (non confirmable). */
  onRecuTexte(): void;
}

/** E5 → E13 : le reçu signé est déposé sur le serveur, puis présenté en QR. Le client le scanne
 *  avec son propre téléphone et confirme l'achat : le passeport y gagne une preuve de plus. */
export function FeuilleRecu({ vente, ouvert, onFermer, onRecuTexte }: FeuilleRecuProps) {
  const [etat, setEtat] = useState<Etat>({ nom: "depot" });
  const [essai, setEssai] = useState(0);

  useEffect(() => {
    if (!ouvert) return;
    let actif = true;
    setEtat({ nom: "depot" });
    deposerRecu(vente).then(
      (id) => { if (actif) setEtat({ nom: "pret", url: lienRecu(id) }); },
      () => { if (actif) setEtat({ nom: "erreur" }); },
    );
    return () => { actif = false; };
  }, [ouvert, vente, essai]);

  return (
    <Sheet ouvert={ouvert} onFermer={onFermer} titre="Reçu pour le client">
      {etat.nom === "depot" && <Skeleton forme="bloc" hauteur="14rem" />}
      {etat.nom === "erreur" && (
        <Alert niveau="attention" titre="Reçu indisponible hors connexion"
          action={<button type="button" className="lien-action" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>}>
          Le reçu à confirmer demande une connexion. Vous pouvez envoyer un reçu texte à la place.
        </Alert>
      )}
      {etat.nom === "erreur" && <Button variante="secondaire" bloc onClick={onRecuTexte}>Envoyer un reçu texte</Button>}
      {etat.nom === "pret" && <RecuPret url={etat.url} />}
    </Sheet>
  );
}

/** navigator.share n'existe pas partout (Firefox de bureau, certains Android anciens). */
const partageNatif = (): boolean => typeof navigator.share === "function";

function RecuPret({ url }: { url: string }) {
  const natif = partageNatif();
  const partager = async () => {
    if (natif) {
      try { await navigator.share({ title: "Votre reçu Caisse Lightning", url }); return; }
      catch (e) { if (e instanceof DOMException && e.name === "AbortError") return; }
    }
    const ok = await copierTexte(url);
    afficherToast(ok ? "Lien du reçu copié" : "Copie impossible sur ce téléphone.", { niveau: ok ? "info" : "erreur" });
  };
  return (
    <div className="feuille-recu">
      <p>Le client scanne ce code avec son téléphone pour confirmer l'achat.</p>
      <div className="feuille-recu__qr"><QrCode valeur={url} label="QR code du reçu à faire scanner par le client" /></div>
      <p className="texte-secondaire">Chaque achat confirmé par un client renforce votre passeport.</p>
      <Button variante="secondaire" bloc icone={natif ? <Share2 aria-hidden="true" /> : <Copy aria-hidden="true" />} onClick={partager}>
        {natif ? "Partager le lien" : "Copier le lien"}
      </Button>
    </div>
  );
}
