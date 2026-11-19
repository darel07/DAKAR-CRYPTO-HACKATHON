import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Copy, Share2 } from "lucide-react";
import {
  Alert, Button, EmptyState, MiniBarChart, QrCode, Segmented, Sheet, Skeleton, StatCard, afficherToast,
} from "../components/ui";
import { activite, apercuPasseport, semaine } from "../lib/domain/activite";
import { formatDateHeure, formatFcfa, formatNombreSimple } from "../lib/domain/format";
import type { Vente } from "../lib/domain/types";
import { lireVentes, useVentes } from "../lib/domain/ventesStore";
import { entreeResume, resumerJour } from "../lib/ia/resumeJour";
import { clePublique, construireContenu, encoder, signerPasseport } from "../lib/nostr/passeport";
import { recupererConfirmations } from "../lib/nostr/recu";
import { lienPasseport } from "../lib/nostr/passeportCourt";
import type { LienPasseport } from "../lib/nostr/passeportCourt";
import { usePreferences } from "../lib/preferences";
import { copierTexte } from "../lib/pressePapiers";

const PERIODES = [
  { valeur: "7", libelle: "7 jours" },
  { valeur: "30", libelle: "30 jours" },
  { valeur: "90", libelle: "90 jours" },
] as const;
type Periode = (typeof PERIODES)[number]["valeur"];

/** Au-delà, un QR devient trop dense pour un téléphone d'entrée de gamme. */
const LIMITE_QR = 1800;

const dateCourte = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" });

/** Carte « Résumé du jour » : texte de l'IA (chiffres agrégés seulement), sinon phrase locale.
 *  Masquée s'il n'y a aucune vente aujourd'hui. */
function ResumeDuJour({ ventes }: { ventes: Vente[] }) {
  const entree = useMemo(() => entreeResume(ventes), [ventes]);
  const [resume, setResume] = useState<{ pour: typeof entree; texte: string } | null>(null);
  const idTitre = useId();

  useEffect(() => {
    if (!entree) return;
    let actif = true;
    void resumerJour(entree).then((texte) => { if (actif) setResume({ pour: entree, texte }); });
    return () => { actif = false; };
  }, [entree]);

  if (!entree) return null;
  const texte = resume?.pour === entree ? resume.texte : null;
  return (
    <section className="carte resume" aria-labelledby={idTitre} aria-busy={texte === null}>
      <h3 id={idTitre} className="carte__titre">Résumé du jour</h3>
      {texte ? <p>{texte}</p> : <><Skeleton largeur="100%" /><Skeleton largeur="70%" /></>}
    </section>
  );
}

/** Feuille « Passeport signé » : QR, Partager, Copier le lien, validité, date de génération. */
function PasseportSigne({ lien, genereLe, onFermer }: { lien: LienPasseport | null; genereLe: number; onFermer(): void }) {
  const [copie, setCopie] = useState(false);
  const [affiche, setAffiche] = useState(lien);
  if (lien && lien !== affiche) { setAffiche(lien); setCopie(false); }
  const l = lien ?? affiche;
  const partageable = typeof navigator.share === "function";
  const minuteur = useRef(0);
  useEffect(() => () => window.clearTimeout(minuteur.current), []);

  // « Lien copié » sur le bouton (vu) et dans une région role=status hors du bouton (annoncé :
  // un texte qui change à l'intérieur d'un bouton ne l'est pas de façon fiable), effacé après 2 s.
  const copier = async () => {
    if (!l) return;
    const ok = await copierTexte(l.url);
    if (!ok) { afficherToast("Copie impossible sur ce téléphone.", { niveau: "erreur" }); return; }
    window.clearTimeout(minuteur.current);
    setCopie(true);
    minuteur.current = window.setTimeout(() => setCopie(false), 2000);
  };
  const partager = async () => {
    if (!l) return;
    try {
      await navigator.share({ title: "Mon passeport de revenus", text: "Voici mon passeport de revenus, signé et vérifiable :", url: l.url });
    } catch (e) {
      if (!(e instanceof DOMException && e.name === "AbortError")) void copier();
    }
  };

  return (
    <Sheet
      ouvert={lien !== null}
      onFermer={onFermer}
      titre="Passeport signé"
      pied={l && (
        <>
          {partageable && <Button bloc icone={<Share2 aria-hidden="true" />} onClick={partager} data-autofocus>Partager</Button>}
          <Button variante="secondaire" bloc icone={<Copy aria-hidden="true" />} onClick={copier}>{copie ? "Lien copié" : "Copier le lien"}</Button>
        </>
      )}
    >
      {l && (
        <>
          <p>Montrez ce code ou envoyez le lien à l'agent de microfinance.</p>
          {l.url.length <= LIMITE_QR
            ? <div className="qr"><QrCode valeur={l.url} label="QR code du passeport de revenus" /></div>
            : <Alert niveau="info">Votre passeport est trop détaillé pour un code QR. Envoyez le lien.</Alert>}
          {l.court && (
            <p className="texte-secondaire passeport__validite">
              Lien valable 30 jours{l.expireLe ? `, jusqu'au ${dateCourte.format(new Date(l.expireLe * 1000))}` : ""}.
            </p>
          )}
          <p className="texte-secondaire passeport__validite">Généré le {formatDateHeure(genereLe)}</p>
          <p className="sr-only" role="status">{copie ? "Lien copié" : ""}</p>
        </>
      )}
    </Sheet>
  );
}

/** E9 : activité et passeport de revenus. */
export function Passeport() {
  const ventes = useVentes();
  const { cleSauvegardee } = usePreferences();
  const [periode, setPeriode] = useState<Periode>("30");
  const [generation, setGeneration] = useState(false);
  const [lien, setLien] = useState<LienPasseport | null>(null);
  const [genereLe, setGenereLe] = useState(0);
  const [erreur, setErreur] = useState<string | null>(null);
  const idActivite = useId();
  const idPasseport = useId();

  const stats = useMemo(() => activite(ventes), [ventes]);
  const jours = useMemo(() => semaine(ventes), [ventes]);
  const apercu = useMemo(() => apercuPasseport(ventes, Number(periode)), [ventes, periode]);
  const total = apercu.prouve + apercu.declare;
  const confirmees = useMemo(() => ventes.filter((v) => v.confirmation && !v.demo).length, [ventes]);

  const generer = async () => {
    setErreur(null);
    setGeneration(true);
    try {
      // Confirmations des clients arrivées depuis l'envoi des reçus (8 s au plus, sinon on signe
      // sans elles) : elles partent dans les lignes du passeport et le prêteur les revérifie.
      await recupererConfirmations(clePublique(), AbortSignal.timeout(8000)).catch(() => 0);
      const contenu = construireContenu(lireVentes(), Number(periode));
      const charge = await encoder(signerPasseport(contenu));
      const l = await lienPasseport(charge);
      setGenereLe(contenu.fin);
      setLien(l);
    } catch {
      setErreur("Impossible de générer le passeport sur ce téléphone. Mettez à jour votre navigateur.");
    } finally {
      setGeneration(false);
    }
  };

  const rappel = !cleSauvegardee && (
    <Alert niveau="attention" action={<a href="#/cle">Sauvegarder ma clé</a>}>
      Sauvegardez votre clé pour ne pas perdre vos preuves.
    </Alert>
  );

  if (ventes.length === 0) {
    return (
      <>
        <header className="page-titre">
          <h1>Mon passeport</h1>
          <p>Une preuve de vos revenus, que l'agent de microfinance peut vérifier lui-même.</p>
        </header>
        {rappel}
        <EmptyState titre="Pas encore de ventes">
          Enregistrez quelques ventes : votre passeport se construit à partir d'elles.
        </EmptyState>
      </>
    );
  }

  return (
    <>
      <header className="page-titre">
        <h1>Mon passeport</h1>
        <p>Une preuve de vos revenus, que l'agent de microfinance peut vérifier lui-même.</p>
      </header>
      {rappel}

      <section className="rubrique" aria-labelledby={idActivite}>
        <h2 id={idActivite}>Mon activité</h2>
        <div className="passeport__stats">
          <StatCard valeur={formatNombreSimple(stats.total)} unite="FCFA" libelle="Ventes sur 30 jours" />
          <StatCard valeur={String(stats.nombre)} libelle="Nombre de ventes" variation="sur 30 jours" />
          <StatCard valeur={formatNombreSimple(stats.panierMoyen)} unite="FCFA" libelle="Panier moyen" />
          <StatCard
            ton="prouve"
            valeur={`${Math.round((stats.partProuvee ?? 0) * 100)} %`}
            libelle="Part prouvée"
          />
        </div>
        <div className="carte"><MiniBarChart jours={jours} /></div>
      </section>

      <ResumeDuJour ventes={ventes} />

      <section className="rubrique" aria-labelledby={idPasseport}>
        <h2 id={idPasseport}>Mon passeport de revenus</h2>
        <Segmented label="Période du passeport" options={PERIODES} valeur={periode} onChange={setPeriode} bloc />
        <div className="chiffre-cle chiffre-cle--passeport">
          <span className="chiffre-cle__valeur chiffres">{formatFcfa(total)}</span>
          <span className="chiffre-cle__libelle">
            {total === 0
              ? "Aucune vente sur cette période."
              : <>dont {formatFcfa(apercu.prouve)} prouvés ({apercu.nbProuvees}) et {formatFcfa(apercu.declare)} déclarés ({apercu.nbDeclarees})</>}
          </span>
        </div>
        {apercu.nbDemo > 0 && (
          <p className="texte-secondaire">
            {apercu.nbDemo > 1
              ? `${apercu.nbDemo} paiements de démonstration ne comptent pas : ils sont simulés.`
              : "1 paiement de démonstration ne compte pas : il est simulé."}
          </p>
        )}
        {confirmees > 0 && (
          <p className="texte-secondaire">
            {confirmees > 1 ? `${confirmees} ventes confirmées par vos clients.` : "1 vente confirmée par un client."}
          </p>
        )}
        <p className="texte-secondaire">Plus la part prouvée est grande, plus votre passeport est solide.</p>
        {erreur && <Alert niveau="erreur">{erreur}</Alert>}
        <Button taille="lg" bloc onClick={generer} disabled={total === 0} chargement={generation && "Génération du passeport…"}>
          Générer mon passeport
        </Button>
      </section>

      <PasseportSigne lien={lien} genereLe={genereLe} onFermer={() => setLien(null)} />
    </>
  );
}
