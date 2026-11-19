import { useEffect, useMemo, useState } from "react";
import { Copy, Download } from "lucide-react";
import {
  AmountDisplay, Button, EmptyState, PastilleVente, Segmented, Sheet, StatCard, TransactionList, afficherToast,
} from "../components/ui";
import { PERIODES, filtrerPeriode, periodeParDefaut, telechargerHistorique, totaux } from "../lib/domain/historique";
import type { Periode } from "../lib/domain/historique";
import { formatDateHeure, formatNombreSimple, referenceCourte } from "../lib/domain/format";
import { statutVente } from "../lib/domain/statut";
import type { MoyenVente, Vente } from "../lib/domain/types";
import { chargerExemple, useVentes } from "../lib/domain/ventesStore";
import { copierTexte } from "../lib/pressePapiers";
import { aller, remplacer, useRoute } from "../lib/useRoute";

const MOYENS: Record<MoyenVente, string> = { especes: "Espèces", wave: "Wave", autre: "Autre" };

const nombreVentes = (n: number) => (n === 0 ? "Aucune vente" : n === 1 ? "1 vente" : `${n} ventes`);

function telecharger(ventes: Vente[]) {
  afficherToast(`Historique exporté : ${telechargerHistorique(ventes)}`);
}

/** E8 : détail d'une vente, en feuille du bas sur l'historique. */
function DetailVente({ vente, onFermer }: { vente: Vente | null; onFermer(): void }) {
  // La feuille garde son contenu pendant qu'elle se ferme.
  const [affichee, setAffichee] = useState(vente);
  if (vente && vente !== affichee) setAffichee(vente);
  const v = vente ?? affichee;
  const statut = v ? statutVente(v) : "declare";
  const prouvee = statut === "prouve";
  const lightning = v?.type === "lightning";

  const copierPreuve = async () => {
    if (!v?.preimage) return;
    const ok = await copierTexte(v.preimage);
    afficherToast(ok ? "Preuve copiée" : "Copie impossible sur ce téléphone.", { niveau: ok ? "info" : "erreur" });
  };

  return (
    <Sheet
      ouvert={vente !== null}
      onFermer={onFermer}
      titre="Détail de la vente"
      pied={prouvee && v?.preimage
        ? <Button variante="discret" bloc icone={<Copy aria-hidden="true" />} onClick={copierPreuve}>Copier la preuve</Button>
        : undefined}
    >
      {v && (
        <>
          <AmountDisplay montant={v.montantFcfa} taille="secondaire" />
          <p className="detail__libelle">{v.libelle}</p>
          <dl className="detail__lignes">
            <div><dt>Date</dt><dd>{formatDateHeure(v.ts)}</dd></div>
            <div><dt>Statut</dt><dd><PastilleVente vente={v} /></dd></div>
            {(lightning || v.moyen) && <div><dt>Moyen</dt><dd>{lightning ? "Lightning" : MOYENS[v.moyen!]}</dd></div>}
            {lightning && v.paymentHash && <div><dt>Réf.</dt><dd className="chiffres">{referenceCourte(v.paymentHash)}</dd></div>}
          </dl>
          <p className="texte-secondaire">
            {prouvee
              ? "Paiement confirmé par votre portefeuille : la preuve peut être vérifiée par un agent de microfinance."
              : statut === "demo"
                ? "Paiement simulé en mode démonstration : il ne compte pas comme preuve."
                : "Vente notée à la main : elle compte moins qu'un paiement prouvé."}
          </p>
        </>
      )}
    </Sheet>
  );
}

/** E7 : historique des ventes. Le détail d'une vente a sa propre adresse (#/ventes/<id>) : le retour
 *  Android ferme la feuille, et la liste garde son filtre et sa position. */
export function Historique() {
  const ventes = useVentes();
  const { param } = useRoute();
  const [periode, setPeriode] = useState<Periode>(() => periodeParDefaut(ventes));

  const affichees = useMemo(() => filtrerPeriode(ventes, periode), [ventes, periode]);
  const t = useMemo(() => totaux(affichees), [affichees]);

  // Détail ouvert depuis la liste : le fermer revient à l'entrée de la liste (history.back).
  // Ouvert par un lien direct (ou rechargé) : il n'y a pas forcément de liste derrière, et
  // history.back() ferait quitter l'application. On empile alors l'entrée de la liste.
  const [suivi, setSuivi] = useState({ param, depuisListe: false });
  if (suivi.param !== param) setSuivi({ param, depuisListe: param !== null && suivi.param === null });
  const detail = param ? ventes.find((v) => v.id === param) ?? null : null;
  const fermerDetail = () => {
    if (suivi.depuisListe) history.back();
    else aller("/ventes");
  };
  // Vente inconnue (effacée, lien abîmé) : retour à la liste.
  useEffect(() => {
    if (param && !detail) remplacer("/ventes");
  }, [param, detail]);

  if (ventes.length === 0) {
    return (
      <>
        <header className="page-titre">
          <h1>Historique des ventes</h1>
          <p>Retrouvez toutes vos transactions au même endroit.</p>
        </header>
        <EmptyState
          titre="Vos ventes apparaîtront ici."
          action={<Button variante="secondaire" onClick={chargerExemple}>Charger des données d'exemple</Button>}
        >
          Encaissez un paiement ou notez une vente en espèces ou Wave.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <header className="page-titre">
        <h1>Historique des ventes</h1>
        <p>Retrouvez toutes vos transactions au même endroit.</p>
      </header>
      <Segmented label="Période" options={PERIODES} valeur={periode} onChange={setPeriode} />
      <div className="historique__totaux">
        <StatCard ton="prouve" valeur={formatNombreSimple(t.prouve)} unite="FCFA" libelle="Prouvé" variation={nombreVentes(t.nbProuvees)} />
        <StatCard ton="declare" valeur={formatNombreSimple(t.declare)} unite="FCFA" libelle="Déclaré" variation={nombreVentes(t.nbDeclarees)} />
      </div>
      {affichees.length === 0 ? (
        <EmptyState titre="Aucune vente sur cette période." />
      ) : (
        <>
          <TransactionList ventes={affichees} lien={(v) => `#/ventes/${v.id}`} />
          <Button variante="secondaire" bloc icone={<Download aria-hidden="true" />} onClick={() => telecharger(affichees)}>
            Exporter l'historique
          </Button>
        </>
      )}
      <DetailVente vente={detail} onFermer={fermerDetail} />
    </>
  );
}
