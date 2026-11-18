import { useEffect, useState } from "react";
import { CircleCheck, TriangleAlert } from "lucide-react";
import { Alert, Badge, Skeleton } from "../components/ui";
import { formatFcfa } from "../lib/domain/format";
import { decoder, PART_PLAFOND, verifier } from "../lib/nostr/passeport";
import type { Verification } from "../lib/nostr/passeport";

type Etat = { nom: "chargement" } | { nom: "erreur" } | { nom: "pret"; v: Verification };

/** Page ouverte par l'agent de microfinance : aucun compte, aucune installation. Tout
 *  est recalculé ici à partir des données signées, rien n'est pris sur parole. */
export function VuePreteur({ charge }: { charge: string | null }) {
  const [etat, setEtat] = useState<Etat>({ nom: "chargement" });

  useEffect(() => {
    let actif = true;
    if (!charge) { setEtat({ nom: "erreur" }); return; }
    decoder(charge)
      .then((ev) => { if (actif) setEtat({ nom: "pret", v: verifier(ev) }); })
      .catch(() => { if (actif) setEtat({ nom: "erreur" }); });
    return () => { actif = false; };
  }, [charge]);

  return (
    <div className="coque--libre">
      <header className="page-titre"><h1>Vérification d'un passeport de revenus</h1></header>
      {etat.nom === "chargement" && <><Skeleton hauteur="4rem" /><Skeleton hauteur="8rem" /></>}
      {etat.nom === "erreur" && <Alert niveau="erreur" titre="Passeport illisible">Le lien est incomplet ou abîmé. Demandez au commerçant de le renvoyer.</Alert>}
      {etat.nom === "pret" && <Resultat v={etat.v} />}
    </div>
  );
}

function Resultat({ v }: { v: Verification }) {
  const total = v.totalProuve + v.totalDeclare;
  return (
    <>
      {v.signatureValide
        ? <Alert niveau="succes" titre="Signature valide">Ce relevé n'a pas été modifié depuis sa signature.</Alert>
        : <Alert niveau="erreur" titre="Signature invalide">Ne vous fiez pas à ces chiffres : le relevé a été modifié ou n'est pas authentique.</Alert>}

      <div className="chiffre-cle">
        <span className="chiffre-cle__libelle">Sur {v.jours} jours</span>
        <span className="chiffre-cle__valeur">{formatFcfa(total)}</span>
      </div>
      <div className="totaux">
        <div className="total total--prouve"><span className="total__valeur">{formatFcfa(v.totalProuve)}</span><span className="total__libelle">Prouvé : {v.nbProuvees} paiements vérifiés</span></div>
        <div className="total total--declare"><span className="total__valeur">{formatFcfa(v.totalDeclare)}</span><span className="total__libelle">Déclaré : {v.nbDeclarees} ventes</span></div>
      </div>

      {v.preuvesRejetees > 0 && (
        <Alert niveau="erreur" titre={`${v.preuvesRejetees} preuve(s) de paiement rejetée(s)`}>Ces lignes ne comptent pas dans le total prouvé.</Alert>
      )}

      <section className="rubrique">
        <h2>Plafond de prêt indicatif</h2>
        <div className="chiffre-cle">
          <span className="chiffre-cle__valeur">{formatFcfa(v.plafondTotal)}</span>
          <span className="chiffre-cle__libelle">{Math.round(PART_PLAFOND * 100)} % du flux mensuel estimé (prouvé + déclaré)</span>
        </div>
        <div className="chiffre-cle">
          <span className="chiffre-cle__valeur">{formatFcfa(v.plafondProuve)}</span>
          <span className="chiffre-cle__libelle">en ne comptant que le prouvé</span>
        </div>
        <Alert niveau="info" titre="Indicatif, non contraignant">Ce montant aide à discuter. La décision de crédit reste la vôtre.</Alert>
      </section>

      <section className="rubrique">
        <h2>Ce qui a été vérifié</h2>
        <ul className="liste-verif">
          <li>{v.signatureValide ? <CircleCheck size={22} aria-hidden="true" /> : <TriangleAlert size={22} aria-hidden="true" />}
            Signature Nostr de l'auteur <Badge ton="neutre">{v.auteur.slice(0, 8)}…</Badge></li>
          <li><CircleCheck size={22} aria-hidden="true" /> Chaque paiement prouvé : la préimage correspond à la facture.</li>
          <li><TriangleAlert size={22} aria-hidden="true" /> Non vérifié : les ventes déclarées reposent sur la parole du commerçant. Un commerçant peut se payer lui-même : comparez avec ce que vous voyez sur place.</li>
        </ul>
      </section>
    </>
  );
}
