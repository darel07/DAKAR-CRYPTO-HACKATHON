import { useState } from "react";
import { Alert, Badge, Button, Field } from "../components/ui";
import { supprimerToutes } from "../lib/domain/ventesStore";
import { ErreurWallet, useWallet } from "../lib/lightning/WalletContext";
import { clePublique } from "../lib/nostr/passeport";

export function Reglages() {
  const { portefeuille, connecter, activerDemo, deconnecter } = useWallet();
  const [lien, setLien] = useState("");
  const [erreur, setErreur] = useState<string | null>(null);

  const brancher = () => {
    setErreur(null);
    try { connecter(lien); setLien(""); }
    catch (e) { setErreur(e instanceof ErreurWallet ? e.message : "Connexion impossible."); }
  };

  return (
    <>
      <header className="page-titre"><h1>Réglages</h1></header>

      <section className="rubrique">
        <h2>Mon wallet</h2>
        {portefeuille ? (
          <>
            <Alert niveau="succes" titre={portefeuille.mode === "demo" ? "Mode démonstration actif" : "Wallet connecté"}>
              L'application peut créer des factures. Elle ne peut pas dépenser votre argent.
            </Alert>
            <Button variante="secondaire" bloc onClick={deconnecter}>Déconnecter le wallet</Button>
          </>
        ) : (
          <>
            <Field label="Lien de connexion du wallet" aide="Collez le lien donné par Alby Hub ou LNbits. Il reste sur ce téléphone."
              type="password" autoComplete="off" value={lien} onChange={(e) => setLien(e.target.value)} erreur={erreur} />
            <Button bloc onClick={brancher} disabled={!lien.trim()}>Connecter</Button>
            <Button variante="discret" bloc onClick={activerDemo}>Essayer en mode démonstration</Button>
          </>
        )}
      </section>

      <section className="rubrique">
        <h2>Ma signature</h2>
        <p>Votre passeport est signé avec cette identité, créée sur ce téléphone.</p>
        <Badge ton="neutre">{clePublique().slice(0, 16)}…</Badge>
      </section>

      <section className="rubrique">
        <h2>Données</h2>
        <Button variante="danger" bloc onClick={() => { if (window.confirm("Effacer toutes vos ventes de ce téléphone ?")) supprimerToutes(); }}>
          Effacer mes ventes
        </Button>
      </section>
    </>
  );
}
