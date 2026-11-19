import { useId, useState } from "react";
import type { ClipboardEvent, FormEvent, ReactNode } from "react";
import { flushSync } from "react-dom";
import {
  Bitcoin, ChevronRight, Code, Download, Fingerprint, FlaskConical, Info, KeyRound, Languages,
  RotateCcw, ShieldCheck, Smartphone, SunMoon, Trash2, Wallet,
} from "lucide-react";
import { Badge, Button, Confirmation, Field, Segmented, Sheet, Switch, WalletStatus, afficherToast } from "../components/ui";
import type { EtatPortefeuille } from "../components/ui";
import { formatFcfa } from "../lib/domain/format";
import { telechargerHistorique } from "../lib/domain/historique";
import { supprimerToutes, useVentes } from "../lib/domain/ventesStore";
import { useWallet } from "../lib/lightning/WalletContext";
import { aller } from "../lib/useRoute";
import { CONSIGNE_IOS, estInstallee, estIos, installer, peutInstaller } from "../lib/pwa";
import { NOMBRE_MOTS, restaurerDepuisMots } from "../lib/nostr/mots";
import { clePublique } from "../lib/nostr/passeport";
import { modifierPreferences, PLAFOND_MAX, usePreferences } from "../lib/preferences";
import type { Theme } from "../lib/preferences";

const THEMES = [{ valeur: "clair", libelle: "Clair" }, { valeur: "sombre", libelle: "Sombre" }] as const;
const DEPOT = "https://github.com/darel07/DAKAR-CRYPTO-HACKATHON";

/** Clair / Sombre en fondu de 240 ms (View Transition, sur le compositeur) ; immédiat en
 *  mouvement réduit ou sans prise en charge. flushSync : le contrôle choisi fait partie de la
 *  nouvelle image. */
function changerTheme(theme: Theme) {
  const doc = document as Document & { startViewTransition?: (maj: () => void) => unknown };
  const appliquer = () => flushSync(() => modifierPreferences({ theme }));
  if (doc.startViewTransition && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    doc.startViewTransition(appliquer);
  } else {
    appliquer();
  }
}

interface LigneProps {
  icone: ReactNode;
  libelle: string;
  /** Valeur ou contrôle à droite. */
  children?: ReactNode;
  href?: string;
  externe?: boolean;
  onClick?(): void;
  desactivee?: boolean;
}

/** Ligne de 56 px : icône, libellé, valeur ou contrôle à droite. Lien ou bouton si elle mène quelque part. */
function Ligne({ icone, libelle, children, href, externe, onClick, desactivee }: LigneProps) {
  const contenu = (
    <>
      <span className="reglage__icone" aria-hidden="true">{icone}</span>
      <span className="reglage__libelle">{libelle}</span>
      {children !== undefined && <span className="reglage__valeur">{children}</span>}
      {(href || onClick) && <ChevronRight className="reglage__chevron" aria-hidden="true" />}
    </>
  );
  if (href) {
    return (
      <a className="reglage reglage--action" href={href} {...(externe ? { target: "_blank", rel: "noopener" } : {})}>
        {contenu}
      </a>
    );
  }
  if (onClick) {
    return <button type="button" className="reglage reglage--action" onClick={onClick} disabled={desactivee}>{contenu}</button>;
  }
  return <div className={`reglage${desactivee ? " reglage--desactivee" : ""}`} aria-disabled={desactivee || undefined}>{contenu}</div>;
}

function Groupe({ titre, children }: { titre: string; children: ReactNode }) {
  const id = useId();
  return (
    <section className="reglages__groupe" aria-labelledby={id}>
      <h2 id={id}>{titre}</h2>
      <div className="reglages__carte">{children}</div>
    </section>
  );
}

/** Restauration de l'identité de signature par 12 mots (NIP-06). Les mots ne sont jamais copiés. */
function RestaurationCle({ ouvert, onFermer }: { ouvert: boolean; onFermer(): void }) {
  const [mots, setMots] = useState<string[]>(() => Array(NOMBRE_MOTS).fill(""));
  const [erreur, setErreur] = useState<string | null>(null);
  const [enCours, setEnCours] = useState(false);
  const idErreur = useId();

  const fermer = () => { setMots(Array(NOMBRE_MOTS).fill("")); setErreur(null); onFermer(); };
  const ecrire = (i: number, valeur: string) => setMots((m) => m.map((x, j) => (j === i ? valeur : x)));

  // Coller les 12 mots d'un coup dans n'importe quel champ : ils sont répartis à partir de celui-ci.
  const coller = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    const liste = e.clipboardData.getData("text").trim().split(/\s+/);
    if (liste.length < 2) return;
    e.preventDefault();
    setMots((m) => m.map((x, j) => (j >= i && j - i < liste.length ? liste[j - i]! : x)));
  };

  const restaurer = async (e: FormEvent) => {
    e.preventDefault();
    setErreur(null);
    setEnCours(true);
    const ok = await restaurerDepuisMots(mots).catch(() => false);
    setEnCours(false);
    if (!ok) { setErreur("Ces 12 mots ne forment pas une clé valide. Vérifiez l'orthographe et l'ordre."); return; }
    modifierPreferences({ cleSauvegardee: true });
    fermer();
    afficherToast("Clé restaurée : votre identité de signature est rétablie.");
  };

  const complets = mots.every((m) => m.trim());
  return (
    <Sheet ouvert={ouvert} onFermer={fermer} titre="Restaurer avec mes 12 mots">
      <form className="reglages__formulaire" onSubmit={restaurer}>
        <p>Écrivez vos 12 mots dans l'ordre. La clé actuelle de ce téléphone sera remplacée ; les passeports déjà envoyés restent valables.</p>
        <ol className="mots">
          {mots.map((m, i) => (
            <li key={i} className="mots__mot">
              <label>
                <span className="mots__numero chiffres">{i + 1}</span>
                <input
                  className="mots__entree" value={m} aria-label={`Mot ${i + 1}`}
                  autoComplete="off" autoCapitalize="none" autoCorrect="off" spellCheck={false}
                  onChange={(e) => ecrire(i, e.target.value)} onPaste={(e) => coller(i, e)}
                  aria-invalid={erreur ? true : undefined}
                  aria-describedby={erreur ? idErreur : undefined}
                />
              </label>
            </li>
          ))}
        </ol>
        {erreur && <p id={idErreur} className="champ__erreur" role="alert">{erreur}</p>}
        <Button type="submit" bloc disabled={!complets} chargement={enCours && "Vérification…"}>Restaurer ma clé</Button>
      </form>
    </Sheet>
  );
}

/** Invitation du navigateur si elle est disponible ; sinon la marche à suivre (iOS, ou
 *  navigateur qui a déjà refusé l'invitation automatique). */
async function installerApplication(): Promise<void> {
  if (peutInstaller()) { await installer(); return; }
  afficherToast(estIos() ? CONSIGNE_IOS : "Ouvrez le menu du navigateur, puis « Installer l'application » ou « Ajouter à l'écran d'accueil ».", { duree: 10_000 });
}

/** E11 : réglages, en liste groupée. */
export function Reglages() {
  const { portefeuille, activerDemo, deconnecter } = useWallet();
  const prefs = usePreferences();
  const ventes = useVentes();
  const [restauration, setRestauration] = useState(false);
  const [deconnexion, setDeconnexion] = useState(false);
  const [effacement, setEffacement] = useState(false);
  const [plafond, setPlafond] = useState(String(prefs.plafondFcfa));

  const demo = portefeuille?.mode === "demo";
  const nwc = portefeuille?.mode === "nwc";
  const etat: EtatPortefeuille = nwc ? "connecte" : demo ? "demo" : "deconnecte";

  const montantPlafond = Number(plafond);
  const erreurPlafond = /^\d+$/.test(plafond) && montantPlafond > 0 && montantPlafond <= PLAFOND_MAX
    ? null : `Veuillez saisir un montant valide, jusqu'à ${formatFcfa(PLAFOND_MAX)}.`;
  const changerPlafond = (valeur: string) => {
    const chiffres = valeur.replace(/[\s  ]/g, "");
    setPlafond(chiffres);
    const n = Number(chiffres);
    if (/^\d+$/.test(chiffres) && n > 0 && n <= PLAFOND_MAX) modifierPreferences({ plafondFcfa: n });
  };

  return (
    <>
      <header className="page-titre"><h1>Réglages</h1></header>

      <Groupe titre="Portefeuille Lightning">
        <Ligne icone={<Wallet />} libelle="État"><WalletStatus etat={etat} /></Ligne>
        <p className="reglages__aide">
          {nwc
            ? "La caisse peut seulement créer des demandes de paiement : elle ne peut jamais dépenser votre argent."
            : demo
              ? "Les paiements sont simulés : rien n'est encaissé. Connectez votre portefeuille pour encaisser pour de vrai."
              : "Connectez votre portefeuille pour encaisser en Lightning."}
        </p>
        <div className="reglages__bouton">
          {nwc
            ? <Button variante="secondaire" bloc onClick={() => setDeconnexion(true)}>Déconnecter</Button>
            : <Button bloc onClick={() => aller("/connexion")}>Connecter mon portefeuille</Button>}
        </div>
        <Switch
          icone={<FlaskConical />}
          label="Mode démonstration"
          aide={nwc ? "Déconnectez votre portefeuille pour l'utiliser." : undefined}
          checked={demo}
          disabled={nwc}
          onChange={(actif) => (actif ? activerDemo() : deconnecter())}
        />
      </Groupe>

      <Groupe titre="Préférences">
        <Ligne icone={<SunMoon />} libelle="Apparence">
          <Segmented label="Apparence" options={THEMES} valeur={prefs.theme} onChange={changerTheme} />
        </Ligne>
        <Switch
          icone={<Bitcoin />}
          label="Afficher l'équivalent en sats"
          checked={prefs.satsVisibles}
          onChange={(satsVisibles) => modifierPreferences({ satsVisibles })}
        />
        <Ligne icone={<Languages />} libelle="Langue">Français</Ligne>
        <Ligne icone={<Languages />} libelle="Wolof" desactivee><Badge ton="neutre">Bientôt</Badge></Ligne>
      </Groupe>

      <Groupe titre="Sécurité">
        <div className="reglages__champ">
          <Field
            label="Plafond par vente (FCFA)"
            aide="Le pavé refuse un montant plus élevé."
            inputMode="numeric" autoComplete="off"
            value={plafond}
            onChange={(e) => changerPlafond(e.target.value)}
            onBlur={() => { if (erreurPlafond) setPlafond(String(prefs.plafondFcfa)); }}
            erreur={erreurPlafond}
          />
        </div>
        <Ligne icone={<KeyRound />} libelle="Sauvegarder ma clé" href="#/cle">
          {prefs.cleSauvegardee ? <Badge ton="prouve">Fait</Badge> : <Badge ton="ambre">À faire</Badge>}
        </Ligne>
        <Ligne icone={<RotateCcw />} libelle="Restaurer avec mes 12 mots" onClick={() => setRestauration(true)} />
        <Ligne icone={<Fingerprint />} libelle="Mon identité de signature">
          <span className="chiffres">{clePublique().slice(0, 8)}</span>
        </Ligne>
      </Groupe>

      <Groupe titre="Données">
        <Ligne
          icone={<Download />} libelle="Exporter l'historique" desactivee={ventes.length === 0}
          onClick={() => afficherToast(`Historique exporté : ${telechargerHistorique(ventes)}`)}
        />
        <div className="reglages__bouton">
          <Button variante="danger" bloc icone={<Trash2 aria-hidden="true" />} disabled={ventes.length === 0} onClick={() => setEffacement(true)}>
            Effacer mes ventes
          </Button>
        </div>
      </Groupe>

      {!estInstallee() && (
        <Groupe titre="Application">
          <Ligne icone={<Smartphone />} libelle="Installer sur l'écran d'accueil" onClick={installerApplication} />
        </Groupe>
      )}

      <Groupe titre="À propos">
        <Ligne icone={<Info />} libelle="Version"><span className="chiffres">{__VERSION_APP__}</span></Ligne>
        <Ligne icone={<Code />} libelle="Code source" href={DEPOT} externe />
        <Ligne icone={<ShieldCheck />} libelle="Projet du Dakar Bitcoin Hack 2026" />
      </Groupe>

      <RestaurationCle ouvert={restauration} onFermer={() => setRestauration(false)} />
      <Confirmation
        ouvert={deconnexion}
        titre="Déconnecter votre portefeuille ?"
        confirmer="Déconnecter"
        danger
        onConfirmer={() => { deconnecter(); setDeconnexion(false); afficherToast("Portefeuille déconnecté."); }}
        onAnnuler={() => setDeconnexion(false)}
      >
        <p>La caisse ne pourra plus encaisser en Lightning. Vos ventes restent sur ce téléphone.</p>
      </Confirmation>
      <Confirmation
        ouvert={effacement}
        titre={`Effacer ${ventes.length > 1 ? `${ventes.length} ventes` : "1 vente"} de ce téléphone ?`}
        confirmer={`Effacer ${ventes.length > 1 ? `${ventes.length} ventes` : "1 vente"}`}
        danger
        onConfirmer={() => { supprimerToutes(); setEffacement(false); afficherToast("Ventes effacées."); }}
        onAnnuler={() => setEffacement(false)}
      >
        <p>Cette action est définitive. Exportez votre historique avant si vous voulez le garder.</p>
      </Confirmation>
    </>
  );
}
