import { useEffect, useLayoutEffect, useState } from "react";
import type { ReactNode } from "react";
import { CircleCheck, Printer, TriangleAlert } from "lucide-react";
import { Alert, AmountDisplay, Button, Skeleton, StatCard } from "../components/ui";
import { appelerApi, ErreurApi } from "../lib/api";
import { formatFcfa } from "../lib/domain/format";
import { decoder, PART_PLAFOND, verifier } from "../lib/nostr/verification";
import type { Verification } from "../lib/nostr/verification";
import { appliquerTheme, lirePreferences } from "../lib/preferences";

type Etat =
  | { nom: "chargement" }
  | { nom: "illisible" }
  | { nom: "expire" }
  | { nom: "injoignable" }
  | { nom: "pret"; v: Verification; expireLe: number | null };

const ID_VALIDE = /^[0-9A-Za-z]{10}$/;
const DELAI = 8000;
const date = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });
const dateDe = (s: number) => date.format(new Date(s * 1000));
const pluriel = (n: number, un: string, plusieurs: string) => `${n} ${n > 1 ? plusieurs : un}`;

/** Lien court : la charge est lue sur le serveur (GET /api/passeports/:id), puis vérifiée ici
 *  comme un lien long. Le serveur n'est jamais cru sur parole. */
async function chargeDepuisServeur(id: string, signal: AbortSignal): Promise<{ charge: string; expireLe: number | null }> {
  const r = await appelerApi<{ charge?: unknown; expireLe?: unknown }>(`/passeports/${id}`, { delai: DELAI, signal });
  if (typeof r.charge !== "string") throw new ErreurApi("réponse invalide");
  return { charge: r.charge, expireLe: typeof r.expireLe === "number" ? r.expireLe : null };
}

interface VuePreteurProps {
  /** Lien long : le passeport compressé est dans l'adresse. */
  charge?: string | null;
  /** Lien court : identifiant de 10 caractères. */
  id?: string;
}

/** E12 : page ouverte par l'agent de microfinance, sans compte ni installation. Tout est
 *  recalculé ici à partir des données signées, rien n'est pris sur parole. Thème clair forcé :
 *  c'est un document qu'on lit, qu'on compare et qu'on imprime. */
export function VuePreteur({ charge = null, id }: VuePreteurProps) {
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });
  const [essai, setEssai] = useState(0);

  useLayoutEffect(() => {
    appliquerTheme("clair");
    const titre = document.title;
    document.title = "Vérification d'un passeport de revenus";
    return () => { appliquerTheme(lirePreferences().theme); document.title = titre; };
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setEtat({ nom: "chargement" });
    const lire = async (): Promise<Etat> => {
      if (id !== undefined) {
        if (!ID_VALIDE.test(id)) return { nom: "illisible" };
        let reponse: { charge: string; expireLe: number | null };
        try {
          reponse = await chargeDepuisServeur(id, ctrl.signal);
        } catch (e) {
          return e instanceof ErreurApi && e.statut === 404 ? { nom: "expire" } : { nom: "injoignable" };
        }
        try { return { nom: "pret", v: verifier(await decoder(reponse.charge)), expireLe: reponse.expireLe }; }
        catch { return { nom: "illisible" }; }
      }
      if (!charge) return { nom: "illisible" };
      try { return { nom: "pret", v: verifier(await decoder(charge)), expireLe: null }; }
      catch { return { nom: "illisible" }; }
    };
    lire().then((e) => { if (!ctrl.signal.aborted) setEtat(e); }, () => undefined);
    return () => ctrl.abort();
  }, [charge, id, essai]);

  return (
    <div className="coque--libre preteur">
      <header className="preteur__entete">
        <p className="preteur__marque"><img src="/icone.svg" alt="" width="28" height="28" /> Caisse Lightning</p>
        <h1>Vérification d'un passeport de revenus</h1>
      </header>
      {etat.nom === "chargement" && (
        <div className="preteur__squelettes" aria-busy="true" aria-label="Vérification en cours">
          <Skeleton forme="bloc" hauteur="3.5rem" />
          <Skeleton forme="bloc" hauteur="6rem" />
          <Skeleton forme="bloc" hauteur="8rem" />
        </div>
      )}
      {etat.nom === "illisible" && (
        <Alert niveau="erreur" titre="Passeport illisible">Le lien est incomplet ou abîmé. Demandez au commerçant de le renvoyer.</Alert>
      )}
      {etat.nom === "expire" && (
        <Alert niveau="erreur" titre="Passeport introuvable">
          Ce passeport n'existe pas ou a expiré : un lien court reste valable 30 jours. Demandez au commerçant d'en générer un nouveau.
        </Alert>
      )}
      {etat.nom === "injoignable" && (
        <Alert niveau="erreur" titre="Serveur injoignable" action={<button type="button" className="lien-action" onClick={() => setEssai((n) => n + 1)}>Réessayer</button>}>
          Impossible de lire ce passeport pour l'instant. Vérifiez votre connexion, ou demandez au commerçant le lien complet.
        </Alert>
      )}
      {etat.nom === "pret" && <Resultat v={etat.v} expireLe={etat.expireLe} />}
    </div>
  );
}

function Resultat({ v, expireLe }: { v: Verification; expireLe: number | null }) {
  const total = v.totalProuve + v.totalDeclare;
  return (
    <>
      {v.signatureValide
        ? <Alert niveau="succes" titre="Signature valide">Ce relevé n'a pas été modifié depuis sa signature.</Alert>
        : <Alert niveau="erreur" titre="Signature invalide">Ne vous fiez pas à ces chiffres.</Alert>}

      <section className="preteur__periode">
        <AmountDisplay montant={total} taille="secondaire" libelle={`Sur ${v.jours} jours`} />
        {v.contenu && (
          <p className="texte-secondaire">
            Du {dateDe(v.contenu.debut)} au {dateDe(v.contenu.fin)}, signé le {dateDe(v.contenu.fin)}.
            {expireLe ? ` Ce lien expire le ${dateDe(expireLe)}.` : ""}
          </p>
        )}
      </section>

      <div className="preteur__totaux">
        <StatCard ton="prouve" valeur={formatFcfa(v.totalProuve)} libelle="Prouvé" variation={pluriel(v.nbProuvees, "paiement vérifié", "paiements vérifiés")} />
        <StatCard ton="declare" valeur={formatFcfa(v.totalDeclare)} libelle="Déclaré" variation={pluriel(v.nbDeclarees, "vente", "ventes")} />
      </div>

      {v.preuvesRejetees > 0 && (
        <Alert niveau="erreur">
          {v.preuvesRejetees > 1
            ? `${v.preuvesRejetees} preuves de paiement rejetées. Elles ne comptent pas dans le total prouvé.`
            : "1 preuve de paiement rejetée. Elle ne compte pas dans le total prouvé."}
        </Alert>
      )}

      {/* Pas de montant de prêt suggéré à partir d'un relevé dont la signature ne tient pas. */}
      {v.signatureValide && (
        <section className="rubrique">
          <h2>Plafond de prêt indicatif</h2>
          <div className="preteur__plafonds">
            <StatCard valeur={formatFcfa(v.plafondTotal)} libelle={`${Math.round(PART_PLAFOND * 100)} % du flux mensuel estimé`} />
            <StatCard ton="prouve" valeur={formatFcfa(v.plafondProuve)} libelle="en ne comptant que le prouvé" />
          </div>
          <Alert niveau="info">Indicatif, non contraignant. La décision de crédit reste la vôtre.</Alert>
        </section>
      )}

      <section className="rubrique">
        <h2>Ce qui a été vérifié</h2>
        <ul className="liste-verif">
          <Point ok={v.signatureValide}>
            {v.signatureValide ? "Signature de l'auteur" : "Signature de l'auteur invalide"}{" "}
            <span className="chiffres preteur__cle">{v.auteur.slice(0, 8)}…</span>
          </Point>
          {v.nbProuvees + v.preuvesRejetees === 0
            ? <Point ok={false}>Aucun paiement Lightning dans ce relevé : rien n'y est prouvé.</Point>
            : v.preuvesRejetees === 0
              ? <Point ok>Chaque paiement prouvé : la preuve correspond à la demande de paiement.</Point>
              : <Point ok={false}>
                {v.preuvesRejetees > 1
                  ? `${v.preuvesRejetees} preuves ne correspondent pas à leur demande de paiement.`
                  : "1 preuve ne correspond pas à sa demande de paiement."}
              </Point>}
          <Point ok={false}>
            Non vérifié : les ventes déclarées reposent sur la parole du commerçant. Un commerçant peut aussi se
            payer lui-même : comparez avec ce que vous voyez sur place.
          </Point>
        </ul>
      </section>

      <Button variante="secondaire" bloc icone={<Printer aria-hidden="true" />} onClick={() => window.print()} className="preteur__imprimer">
        Imprimer
      </Button>
    </>
  );
}

function Point({ ok, children }: { ok: boolean; children: ReactNode }) {
  const Icone = ok ? CircleCheck : TriangleAlert;
  return (
    <li className={ok ? "liste-verif__ok" : "liste-verif__attention"}>
      <Icone aria-hidden="true" />
      <span><span className="sr-only">{ok ? "Vérifié : " : "Attention : "}</span>{children}</span>
    </li>
  );
}
