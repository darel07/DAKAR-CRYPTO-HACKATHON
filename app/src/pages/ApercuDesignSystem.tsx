import { useEffect, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import { Copy, Pause, Play, RotateCcw, Zap } from "lucide-react";
import {
  Alert, AmountDisplay, Badge, Button, Checkbox, Confirmation, Countdown, EmptyState, Field, LienBouton,
  MiniBarChart, NumericKeypad, OfflineBanner, PaymentQRCode, PaymentStatus, Segmented, Sheet, Skeleton,
  StatCard, Switch, TransactionCard, TransactionList, WalletStatus, afficherToast,
} from "../components/ui";
import { CoinFcfa } from "../components/signature/CoinFcfa";
import { RibbonBackground } from "../components/signature/RibbonBackground";
import { appliquerTheme, lirePreferences, PLAFOND_DEFAUT } from "../lib/preferences";
import type { Theme } from "../lib/preferences";
import { COULEURS, FACTURE_EXEMPLE, SEMAINE_EXEMPLE, ventesExemple } from "./apercu/donnees";

const THEMES = [{ valeur: "clair", libelle: "Clair" }, { valeur: "sombre", libelle: "Sombre" }] as const;
const PERIODES = [{ valeur: "7", libelle: "7 jours" }, { valeur: "30", libelle: "30 jours" }, { valeur: "90", libelle: "90 jours" }] as const;
const FILTRES = [
  { valeur: "jour", libelle: "Aujourd'hui" }, { valeur: "semaine", libelle: "Cette semaine" },
  { valeur: "mois", libelle: "Ce mois" }, { valeur: "tout", libelle: "Toutes les ventes" },
] as const;

function Bloc({ titre, children }: { titre: string; children: ReactNode }) {
  return <section className="apercu-bloc"><h2>{titre}</h2>{children}</section>;
}

/** Contrat visuel du design system : toutes les primitives dans tous leurs états, en clair et
 *  en sombre. À ouvrir (#/apercu-design-system) avant et après toute retouche des tokens.
 *  La bascule de thème n'écrase pas la préférence du commerçant. */
export default function ApercuDesignSystem() {
  const [theme, setTheme] = useState<Theme>(() => lirePreferences().theme);
  const [maintenant] = useState(() => Math.floor(Date.now() / 1000));
  const [chiffres, setChiffres] = useState("12500");
  const [depasse, setDepasse] = useState(false);
  const [lien, setLien] = useState("");
  const [periode, setPeriode] = useState<"7" | "30" | "90">("30");
  const [filtre, setFiltre] = useState<(typeof FILTRES)[number]["valeur"]>("tout");
  const [sats, setSats] = useState(true);
  const [coche, setCoche] = useState(false);
  const [feuille, setFeuille] = useState(false);
  const [confirmation, setConfirmation] = useState(false);
  const [pieceEnPause, setPieceEnPause] = useState(false);
  const [entree, setEntree] = useState(0);
  const [rubansEnPause, setRubansEnPause] = useState(false);

  useEffect(() => { appliquerTheme(theme); }, [theme]);
  useEffect(() => () => appliquerTheme(lirePreferences().theme), []);

  const montant = Number(chiffres || 0);
  const ventes = ventesExemple(maintenant);

  return (
    <div className="apercu">
      <header className="apercu__entete">
        <h1>Design system</h1>
        <Segmented label="Thème de l'aperçu" options={THEMES} valeur={theme} onChange={setTheme} />
      </header>

      <Bloc titre="Couleurs">
        <ul className="apercu-nuancier">
          {COULEURS.map((c) => (
            <li key={c}><span className="apercu-nuancier__pastille" style={{ "--nuance": `var(--${c})` } as CSSProperties} />{c}</li>
          ))}
        </ul>
      </Bloc>

      <Bloc titre="Typographie">
        <p className="montant__valeur">45 500 <span className="montant__devise">FCFA</span></p>
        <p className="apercu-typo apercu-typo--ecran">Titre d'écran 28</p>
        <p className="apercu-typo apercu-typo--section">Titre de section 20</p>
        <p className="apercu-typo apercu-typo--sous-titre">Sous-titre 16</p>
        <p>Texte courant 15 : une caisse simple, rapide et pensée pour les petits commerces.</p>
        <p className="texte-secondaire">Texte secondaire 13, jamais plus petit.</p>
      </Bloc>

      <Bloc titre="Boutons">
        <Button taille="lg" bloc>Créer un QR code</Button>
        <Button bloc>Primaire md</Button>
        <Button variante="secondaire" bloc icone={<Copy aria-hidden="true" />}>Copier la facture</Button>
        <Button variante="discret" bloc>Vente en espèces ou Wave</Button>
        <Button variante="danger" bloc>Effacer mes ventes</Button>
        <Button taille="lg" bloc disabled>Désactivé</Button>
        <Button taille="lg" bloc chargement="Création du QR code…">Créer un QR code</Button>
        <LienBouton variante="secondaire" bloc href="#/apercu-design-system">Lien en forme de bouton</LienBouton>
      </Bloc>

      <Bloc titre="Champs">
        <Field label="Que s'est-il vendu ?" aide="Exemple : 2 sacs de riz, 15 000" maxLength={120} />
        <Field label="Montant en FCFA" inputMode="numeric" defaultValue="0" erreur="Veuillez saisir un montant valide." />
        <Field label="Lien de connexion" revelable autoComplete="off" value={lien} onChange={(e) => setLien(e.target.value)}
          aide="Il commence par nostr+walletconnect:// et reste sur ce téléphone." />
        <Field label="Langue" value="Français" disabled readOnly />
        <Checkbox label="J'ai noté mes 12 mots en lieu sûr." checked={coche} onChange={(e) => setCoche(e.target.checked)} />
      </Bloc>

      <Bloc titre="Montant et pavé">
        <AmountDisplay montant={0} sats={0} libelle="Quel montant souhaitez-vous encaisser ?" />
        <AmountDisplay
          montant={montant} sats={Math.round(montant * 1.515)} cours={{ majLe: maintenant - 120, enCache: false }}
          libelle="Quel montant souhaitez-vous encaisser ?"
          message={depasse ? "Montant supérieur à votre plafond. Modifiez-le dans Réglages." : null}
        />
        <NumericKeypad
          valeur={chiffres} plafond={PLAFOND_DEFAUT}
          onChange={(v) => { setChiffres(v); setDepasse(false); }} onDepassement={() => setDepasse(true)}
        />
        <AmountDisplay montant={12_500} sats={18_940} taille="secondaire" cours={{ majLe: maintenant - 7200, enCache: true }} />
        <AmountDisplay montant={12_500} sats={null} taille="secondaire" message="Cours indisponible. Connectez-vous une fois pour l'enregistrer." />
      </Bloc>

      <Bloc titre="Portefeuille">
        <div className="apercu-rangee">
          <WalletStatus etat="connecte" /><WalletStatus etat="demo" />
          <WalletStatus etat="deconnecte" /><WalletStatus etat="injoignable" />
        </div>
      </Bloc>

      <Bloc titre="Paiement">
        <div className="apercu-centre"><PaymentQRCode facture={FACTURE_EXEMPLE} /></div>
        <PaymentStatus etat="attente" debut={maintenant - 58} expireLe={maintenant + 542} />
        <PaymentStatus etat="confirme" />
        <PaymentStatus etat="expire" />
        <PaymentStatus etat="erreur" />
        <Countdown expireLe={maintenant + 582} />
        <Countdown expireLe={maintenant + 45} />
      </Bloc>

      <Bloc titre="Ventes">
        <TransactionCard vente={ventes[0]!} href="#/apercu-design-system" />
        <TransactionCard vente={ventes[1]!} />
        <TransactionList ventes={ventes} />
      </Bloc>

      <Bloc titre="Statistiques">
        <div className="apercu-grille">
          <StatCard valeur="187 400 FCFA" libelle="Ventes sur 30 jours" variation="+12 % sur 7 jours" />
          <StatCard valeur="62 %" libelle="Part prouvée" />
          <StatCard valeur="8" libelle="Prouvé" ton="prouve" />
          <StatCard valeur="13" libelle="Déclaré" ton="declare" />
        </div>
        <MiniBarChart jours={SEMAINE_EXEMPLE} />
      </Bloc>

      <Bloc titre="Choix et interrupteurs">
        <Segmented label="Période du passeport" options={PERIODES} valeur={periode} onChange={setPeriode} bloc />
        <Segmented label="Période de l'historique" options={FILTRES} valeur={filtre} onChange={setFiltre} />
        <Switch label="Afficher l'équivalent en sats" checked={sats} onChange={setSats} icone={<Zap aria-hidden="true" />} />
        <Switch label="Mode démonstration" aide="Les paiements sont simulés." checked={false} onChange={() => undefined} />
        <Switch label="Wolof (bientôt)" checked={false} onChange={() => undefined} disabled />
      </Bloc>

      <Bloc titre="Pastilles et alertes">
        <div className="apercu-rangee">
          <Badge ton="prouve">Prouvé</Badge><Badge ton="declare">Déclaré</Badge>
          <Badge ton="neutre">Lightning</Badge><Badge ton="ambre">À faire</Badge>
        </div>
        <Alert niveau="info" action={<a href="#/reglages">Connecter</a>}>Connectez votre portefeuille pour encaisser en Lightning.</Alert>
        <Alert niveau="succes" titre="Signature valide">Ce relevé n'a pas été modifié depuis sa signature.</Alert>
        <Alert niveau="attention">Sauvegardez votre clé pour ne pas perdre vos preuves.</Alert>
        <Alert niveau="erreur" titre="Signature invalide">Ne vous fiez pas à ces chiffres.</Alert>
        <OfflineBanner visible />
      </Bloc>

      <Bloc titre="Messages et feuilles">
        <Button variante="secondaire" bloc onClick={() => afficherToast("Facture copiée")}>Toast d'information</Button>
        <Button variante="secondaire" bloc onClick={() => afficherToast("Impossible de contacter votre portefeuille.", { niveau: "erreur" })}>Toast d'erreur</Button>
        <Button variante="secondaire" bloc onClick={() => afficherToast("Une nouvelle version est disponible", { duree: null, action: { libelle: "Mettre à jour", onClick: () => undefined } })}>
          Toast avec action
        </Button>
        <Button variante="secondaire" bloc onClick={() => setFeuille(true)}>Ouvrir une feuille</Button>
        <Button variante="danger" bloc onClick={() => setConfirmation(true)}>Ouvrir une confirmation</Button>
        <Sheet ouvert={feuille} onFermer={() => setFeuille(false)} titre="Paiement Lightning"
          pied={<Button variante="secondaire" bloc icone={<Copy aria-hidden="true" />}>Copier la preuve</Button>}>
          <AmountDisplay montant={12_500} sats={18_940} taille="secondaire" />
          <div className="apercu-rangee"><Badge ton="prouve">Prouvé</Badge><span className="texte-secondaire">18 nov. 2026 à 14:35 · Réf. 3f9a…c21</span></div>
          <p className="texte-doux">Glissez la poignée vers le bas, touchez le voile ou appuyez sur Échap pour fermer.</p>
        </Sheet>
        <Confirmation ouvert={confirmation} titre="Effacer 21 ventes de ce téléphone ?" confirmer="Effacer 21 ventes" danger
          onConfirmer={() => setConfirmation(false)} onAnnuler={() => setConfirmation(false)}>
          <p>Cette action est définitive. Exportez votre historique avant si vous voulez le garder.</p>
        </Confirmation>
      </Bloc>

      <Bloc titre="Pièce (animation signature)">
        <div className="apercu-pieces">
          <figure>
            <CoinFcfa mode="boucle" enPause={pieceEnPause} />
            <figcaption>Boucle (Bienvenue)</figcaption>
          </figure>
          <figure>
            <CoinFcfa key={entree} mode="entree" />
            <figcaption>Entrée (Paiement reçu)</figcaption>
          </figure>
          <figure>
            <CoinFcfa mode="fixe" taille={120} />
            <figcaption>Fixe, 120 px</figcaption>
          </figure>
        </div>
        <div className="apercu-rangee">
          <Button variante="secondaire" icone={pieceEnPause ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />} onClick={() => setPieceEnPause((p) => !p)}>
            {pieceEnPause ? "Relancer la boucle" : "Mettre la boucle en pause"}
          </Button>
          <Button variante="secondaire" icone={<RotateCcw aria-hidden="true" />} onClick={() => setEntree((n) => n + 1)}>Rejouer l'entrée</Button>
        </div>
      </Bloc>

      <Bloc titre="Rubans (animation signature)">
        <div className="apercu-rubans">
          <figure>
            <RibbonBackground variante="plein" enPause={rubansEnPause} className="apercu-rubans__plein" />
            <figcaption>Plein écran (Bienvenue)</figcaption>
          </figure>
          <figure>
            <div className="apercu-rubans__entete">
              <RibbonBackground variante="coin" enPause={rubansEnPause} className="apercu-rubans__coin" />
              <p className="apercu-typo apercu-typo--ecran">Bonjour !</p>
              <p className="texte-doux">Prêt à encaisser votre prochaine vente ?</p>
            </div>
            <figcaption>Coin de l'en-tête (Accueil)</figcaption>
          </figure>
        </div>
        <Button variante="secondaire" icone={rubansEnPause ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />} onClick={() => setRubansEnPause((p) => !p)}>
          {rubansEnPause ? "Relancer les rubans" : "Mettre les rubans en pause"}
        </Button>
      </Bloc>

      <Bloc titre="Vide et chargement">
        <EmptyState titre="Vos ventes apparaîtront ici." action={<Button variante="secondaire">Charger des données d'exemple</Button>} />
        <div className="apercu-squelette-vente">
          <Skeleton largeur="55%" /><Skeleton largeur="5rem" /><Skeleton largeur="35%" />
        </div>
        <Skeleton forme="bloc" />
        <Skeleton forme="cercle" />
      </Bloc>
    </div>
  );
}
