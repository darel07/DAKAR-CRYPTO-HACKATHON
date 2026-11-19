import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import { ExternalLink, Wand } from "lucide-react";
import { Alert, Button, Field, LienBouton, afficherToast } from "../components/ui";
import { useWallet } from "../lib/lightning/WalletContext";
import { ALBY_HUB, creerConnexionAlby, ErreurWallet, testerNwc } from "../lib/lightning/portefeuille";
import type { ConnexionTestee } from "../lib/lightning/portefeuille";
import { lirePreferences, modifierPreferences } from "../lib/preferences";
import { remplacer } from "../lib/useRoute";

type Etat =
  | { nom: "saisie" }
  | { nom: "verification" }
  | { nom: "erreur"; message: string; reessayer: boolean }
  | { nom: "depense"; connexion: ConnexionTestee; url: string };

/** E1 : connecter Alby Hub ou LNbits avec les permissions minimales. La connexion est testée
 *  (get_info, 8 s) avant d'être gardée ; une connexion qui peut dépenser est signalée. */
export function Connexion() {
  const { adopter } = useWallet();
  const [lien, setLien] = useState("");
  const [etat, setEtat] = useState<Etat>({ nom: "saisie" });
  const [auto, setAuto] = useState<"pret" | "attente" | "echec">("pret");
  const titre = useRef<HTMLHeadingElement>(null);
  // Une connexion testée mais pas adoptée (avertissement abandonné) est refermée en sortie.
  const enSuspens = useRef<ConnexionTestee | null>(null);
  useEffect(() => () => enSuspens.current?.portefeuille.fermer(), []);
  useEffect(() => { titre.current?.focus(); }, []);

  const terminer = (connexion: ConnexionTestee, url: string) => {
    enSuspens.current = null;
    adopter(connexion.portefeuille, url);
    modifierPreferences({}); // installation terminée : plus d'écran Bienvenue
    afficherToast("Votre portefeuille est connecté.");
    remplacer(lirePreferences().cleSauvegardee ? "/" : "/cle");
  };

  const verifier = async (url: string) => {
    setEtat({ nom: "verification" });
    try {
      const connexion = await testerNwc(url);
      if (connexion.peutDepenser) {
        enSuspens.current = connexion;
        setEtat({ nom: "depense", connexion, url });
      } else {
        terminer(connexion, url);
      }
    } catch (e) {
      const message = e instanceof ErreurWallet ? e.message : "Impossible de contacter votre portefeuille.";
      setEtat({ nom: "erreur", message, reessayer: message === "Impossible de contacter votre portefeuille." });
    }
  };

  const soumettre = (e: FormEvent) => {
    e.preventDefault();
    if (lien.trim()) void verifier(lien);
  };

  const automatique = async () => {
    setAuto("attente");
    try {
      const url = await creerConnexionAlby();
      setAuto("pret");
      setLien(url);
      await verifier(url);
    } catch {
      setAuto("echec");
    }
  };

  const changerLien = (valeur: string) => {
    setLien(valeur);
    if (etat.nom !== "verification") {
      enSuspens.current?.portefeuille.fermer();
      enSuspens.current = null;
      setEtat({ nom: "saisie" });
    }
  };

  const occupe = etat.nom === "verification";
  return (
    <div className="flux connexion">
      <header className="flux__entete">
        <h1 ref={titre} tabIndex={-1}>Connecter mon portefeuille</h1>
        <p>Votre portefeuille reçoit l'argent. La caisse peut seulement créer des demandes de paiement : elle ne peut jamais dépenser.</p>
      </header>

      <section className="carte connexion__etape" aria-labelledby="etape-1">
        <h2 id="etape-1" className="carte__titre"><span className="connexion__numero">1</span> Créer la connexion</h2>
        <Button bloc icone={<Wand aria-hidden="true" />} onClick={automatique} chargement={auto === "attente" && "Ouverture d'Alby Hub…"} disabled={occupe}>
          Créer la connexion automatiquement
        </Button>
        {auto === "echec" && (
          <p className="texte-secondaire" role="status">La création automatique n'a pas abouti. Faites-le à la main, puis collez le lien ci-dessous.</p>
        )}
        <p>Ou : ouvrez Alby Hub, créez une connexion d'application et copiez le lien.</p>
        <LienBouton variante="secondaire" bloc href={ALBY_HUB} target="_blank" rel="noopener" icone={<ExternalLink aria-hidden="true" />}>
          Ouvrir Alby Hub
        </LienBouton>
      </section>

      <form className="carte connexion__etape" aria-labelledby="etape-2" onSubmit={soumettre}>
        <h2 id="etape-2" className="carte__titre"><span className="connexion__numero">2</span> Coller le lien</h2>
        <Field
          label="Lien de connexion"
          aide="Il commence par nostr+walletconnect:// et reste sur ce téléphone."
          type="password" revelable autoComplete="off" spellCheck={false} autoCapitalize="none"
          value={lien} onChange={(e) => changerLien(e.target.value)}
          erreur={etat.nom === "erreur" && !etat.reessayer ? etat.message : null}
        />
        {etat.nom === "erreur" && etat.reessayer && (
          <Alert niveau="erreur" action={<button type="button" className="lien-action" onClick={() => void verifier(lien)}>Réessayer</button>}>
            {etat.message}
          </Alert>
        )}
        {etat.nom === "depense" && (
          <>
            <Alert niveau="attention">Cette connexion peut dépenser votre argent. Créez-en une limitée à la réception.</Alert>
            <Button variante="secondaire" bloc onClick={() => terminer(etat.connexion, etat.url)}>Continuer quand même</Button>
          </>
        )}
        <Button type="submit" taille="lg" bloc disabled={!lien.trim() || etat.nom === "depense"} chargement={occupe && "Vérification…"}>
          Connecter mon portefeuille
        </Button>
      </form>
    </div>
  );
}
