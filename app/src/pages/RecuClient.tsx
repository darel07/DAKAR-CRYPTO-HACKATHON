import { useEffect, useLayoutEffect, useState } from "react";
import { Alert, AmountDisplay, Button, Skeleton } from "../components/ui";
import { ErreurApi } from "../lib/api";
import { formatDateHeure } from "../lib/domain/format";
import { confirmerAchat, lireRecu } from "../lib/nostr/confirmerAchat";
import type { IssueConfirmation, RecuLu } from "../lib/nostr/confirmerAchat";
import { appliquerTheme, lirePreferences } from "../lib/preferences";

type Etat =
  | { nom: "chargement" }
  | { nom: "introuvable" }
  | { nom: "invalide" }
  | { nom: "injoignable" }
  | { nom: "pret"; recu: RecuLu };

const ID_VALIDE = /^[0-9A-Za-z]{10}$/;

const MESSAGES: Record<Exclude<IssueConfirmation, "confirme">, string> = {
  deja: "Cet achat a déjà été confirmé.",
  refuse: "La confirmation n'a pas pu être vérifiée. Demandez au commerçant de renvoyer le reçu.",
  injoignable: "Impossible d'envoyer la confirmation pour l'instant. Vérifiez votre connexion et réessayez.",
};

async function charger(id: string, signal: AbortSignal): Promise<Etat> {
  if (!ID_VALIDE.test(id)) return { nom: "introuvable" };
  try {
    const recu = await lireRecu(id, signal);
    return recu ? { nom: "pret", recu } : { nom: "invalide" };
  } catch (e) {
    return e instanceof ErreurApi && e.statut === 404 ? { nom: "introuvable" } : { nom: "injoignable" };
  }
}

/** E13 : page ouverte par le CLIENT en scannant le QR du commerçant, sans application ni compte.
 *  Sa confirmation signée rend plus coûteux d'inventer des ventes : le prêteur la revérifie. */
export function RecuClient({ id }: { id: string }) {
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [essai, setEssai] = useState(0);

  useLayoutEffect(() => {
    appliquerTheme("clair");
    const titre = document.title;
    document.title = "Reçu de paiement";
    return () => { appliquerTheme(lirePreferences().theme); document.title = titre; };
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setEtat({ nom: "chargement" });
    charger(id, ctrl.signal).then((e) => { if (!ctrl.signal.aborted) setEtat(e); });
    return () => ctrl.abort();
  }, [id, essai]);

  return (
    <div className="coque--libre preteur recu-client">
      <header className="preteur__entete">
        <p className="preteur__marque"><img src="/icone.svg" alt="" width="28" height="28" /> Caisse Lightning</p>
        <h1>Reçu de paiement</h1>
      </header>
      {etat.nom === "chargement" && (
        <div className="preteur__squelettes" aria-busy="true" aria-label="Chargement du reçu">
          <Skeleton forme="bloc" hauteur="6rem" />
          <Skeleton forme="bloc" hauteur="3.5rem" />
        </div>
      )}
      {etat.nom === "introuvable" && <Alert niveau="erreur" titre="Reçu introuvable">Ce reçu n'existe pas ou a expiré.</Alert>}
      {etat.nom === "invalide" && <Alert niveau="erreur" titre="Reçu non valide">Ce reçu n'est pas valide. Demandez au commerçant de le renvoyer.</Alert>}
      {etat.nom === "injoignable" && (
        <Alert niveau="erreur" titre="Serveur injoignable" action={<button type="button" className="lien-action" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>}>
          Impossible de lire ce reçu pour l'instant. Vérifiez votre connexion.
        </Alert>
      )}
      {etat.nom === "pret" && <Recu id={id} recu={etat.recu} />}
    </div>
  );
}

function Recu({ id, recu }: { id: string; recu: RecuLu }) {
  const [issue, setIssue] = useState<IssueConfirmation | null>(recu.dejaConfirme ? "deja" : null);
  const [envoi, setEnvoi] = useState(false);
  const confirmer = async () => {
    setEnvoi(true);
    setIssue(await confirmerAchat(id, recu).catch((): IssueConfirmation => "injoignable"));
    setEnvoi(false);
  };
  return (
    <>
      <section className="recu-client__ticket carte">
        <AmountDisplay montant={recu.montantFcfa} taille="secondaire" libelle={recu.demo ? "Paiement de démonstration (simulé)" : "Paiement prouvé"} />
        {recu.libelle && recu.libelle !== "Paiement Lightning" && <p>{recu.libelle}</p>}
        <p className="texte-secondaire">{formatDateHeure(recu.ts)}</p>
        <p className="texte-secondaire">Commerçant <span className="chiffres preteur__cle">{recu.commercant.slice(0, 8)}…</span></p>
      </section>
      <EtatConfirmation issue={issue} />
      {issue !== "confirme" && issue !== "deja" && (
        <>
          <p className="texte-secondaire">
            En confirmant, vous aidez ce commerçant à prouver ses revenus pour obtenir un crédit. Aucune donnée personnelle n'est demandée.
          </p>
          <Button taille="lg" bloc onClick={confirmer} chargement={envoi && "Envoi de la confirmation…"}>Confirmer cet achat</Button>
        </>
      )}
    </>
  );
}

function EtatConfirmation({ issue }: { issue: IssueConfirmation | null }) {
  if (issue === null) return null;
  if (issue === "confirme") {
    return (
      <Alert niveau="succes" titre="Merci !">
        Votre confirmation a été enregistrée.
      </Alert>
    );
  }
  return <Alert niveau={issue === "deja" ? "info" : "erreur"}>{MESSAGES[issue]}</Alert>;
}

export default RecuClient;
