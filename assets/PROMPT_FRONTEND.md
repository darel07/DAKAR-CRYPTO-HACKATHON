# Prompt : construire le frontend PWA de Caisse Lightning

> **À qui s'adresse ce fichier** : à un agent de code (Claude) qui doit construire le frontend sans autre contexte. Tout ce qu'il faut est ici ou dans les fichiers cités. Lis ce document en entier avant d'écrire du code, puis suis l'ordre de travail de la section 2.

---

## 0. Mission en une phrase

Construire une **PWA mobile-first** en français qui transforme le téléphone d'un petit commerçant de Dakar en **caisse Lightning** et qui transforme ses ventes en **passeport de revenus signé**, vérifiable par un agent de microfinance.

- Nom du produit à l'écran : **Caisse Lightning** (nom de travail du brief).
- Fonction distinctive : **le passeport de revenus** (onglet « Passeport »).
- Date limite du hackathon : **20 novembre 2026, 21h (GMT+1)**. Prioriser le parcours principal sur les bonus.

## 1. Sources de vérité (à lire, dans cet ordre)

| Fichier | Rôle |
|---|---|
| ce fichier | **Fait foi** en cas de conflit avec les autres |
| `assets/Caisse_Lightning_Brief_UI_UX.docx` | Brief UI/UX d'origine (palette, ton, textes). Ce prompt l'applique et l'ajuste (section 1.1) |
| `assets/references/*.jpg|png` | Planches d'images clés des animations à reproduire (section 6) |
| `assets/*.webm`, `assets/*.png` | Vidéos et images de référence d'origine |
| `docs/PARCOURS_ET_ECRANS.md` | Acteurs et parcours |
| `docs/ECRANS_APP.md` | État du code existant |
| `app/src/lib/**` | **Logique métier existante à réutiliser telle quelle** (section 3.3) |

### 1.1 Arbitrages par rapport au brief (décisions prises, ne pas rediscuter)

| Sujet | Brief | Décision | Raison |
|---|---|---|---|
| Positionnement | Caisse Lightning seule | Caisse + **Passeport de revenus** | L'étude de marché montre qu'une caisse seule existe déjà (8 projets similaires dans le hackathon) ; le passeport est le différenciateur |
| Onglet « Statistiques » | Prévu | Fusionné dans l'onglet **Passeport** (« Mon activité » en haut) | Les statistiques servent le passeport ; 4 onglets maximum |
| Accueil | Dashboard + champ montant | **L'accueil EST la caisse** : salutation compacte, montant et pavé numérique visibles dès l'ouverture | Principe « Rapidité » du brief ; pas de clavier système sur un téléphone d'entrée de gamme |
| Thème | Clair par défaut, sombre en option | Identique : **clair par défaut**, sombre activable dans Réglages (ne suit PAS le système) | Brief |
| Palette | Navy / ambre / vert | Reprise **avec 3 corrections de contraste** (section 4.1) | `#647484` est juste à 4,5:1, l'ambre et l'orange échouent en texte |
| Polices | Satoshi, Manrope, Plus Jakarta Sans | **Plus Jakarta Sans** (titres, montants) + **Manrope** (texte) | Licence OFL, auto-hébergeables dans un dépôt public ; Satoshi (licence Fontshare) écartée |
| Icônes | Lucide | **Lucide** (`lucide-react`), trait 1,75 partout | Brief |
| Styles | Tailwind | **CSS natif + tokens** (`tokens.css`), classes sémantiques | Le code existant est déjà en CSS natif ; zéro dépendance de plus |
| Paramètres « Notifications » | Prévu | **Supprimé** | Aucune notification push dans le MVP ; une option inutile est du bruit |
| Paramètres « Devise d'affichage » | Prévu | Remplacé par l'interrupteur **« Afficher l'équivalent en sats »** | La devise est toujours le FCFA |
| Flou des icônes latérales de la navigation | « éventuellement un flou très léger » | **Pas de flou statique**, opacité seulement ; flou de mouvement uniquement pendant un balayage rapide | Lisibilité et performance sur téléphone modeste |
| Fond animé | Brief : « éviter les fonds animés » ; assets : fond animé à reproduire | **Fond animé uniquement** sur Bienvenue et dans le bandeau haut de l'Accueil, coupé si mouvement réduit, économie de données, onglet masqué ou appareil modeste | Compromis entre les deux demandes |

## 2. Ordre de travail (ne jamais l'inverser)

1. **Tokens** (`src/styles/tokens.css`) : couleurs, typo, espacements, rayons, ombres, durées. Rien d'autre.
2. **Primitives** (`src/components/ui/`) : section 5.
3. **Page `#/apercu-design-system`** : toutes les primitives dans tous leurs états, en clair et en sombre. C'est le contrat visuel.
4. **Animations signature** (`src/components/signature/`) : section 6, chacune testable isolément sur la page d'aperçu.
5. **Écrans** : section 8. Ils assemblent, ils n'inventent ni couleur, ni marge, ni appel réseau.
6. **PWA** : section 9.
7. **Vérifications** : section 11.

## 3. Stack et contraintes techniques

### 3.1 Stack
- React 19 + TypeScript strict (zéro `any`) + Vite. Le projet existe dans `app/`.
- CSS natif : `tokens.css`, `base.css`, `ui.css`, `ecrans.css`, `signature.css`, importés depuis `globals.css`.
- `lucide-react` pour les icônes (remplace `@phosphor-icons/react`, à désinstaller).
- `@fontsource-variable/plus-jakarta-sans` et `@fontsource-variable/manrope` (remplacent Geist).
- `qrcode`, `@getalby/sdk`, `nostr-tools`, `light-bolt11-decoder`, `@noble/hashes` : déjà installés.
- `vite-plugin-pwa` pour le service worker.
- **Pas** de Tailwind, **pas** de Motion/GSAP, **pas** de Three.js : toutes les animations sont en CSS (transitions, `@keyframes`, `linear()` pour les ressorts) et en variables CSS pilotées par `requestAnimationFrame` sur une ref (jamais par `useState` à chaque image).

### 3.2 Budgets
- JavaScript initial compressé : **≤ 170 ko**. Les écrans secondaires (Passeport, Vue prêteur, Réglages, Aperçu) sont chargés à la demande (`React.lazy`).
- Aucun fichier vidéo ni image lourde dans l'application. La pièce et les rubans sont dessinés en CSS/SVG.
- Animations : uniquement `transform` et `opacity` (et `filter` sur de très petites surfaces).
- Cibles tactiles ≥ 48 × 48 px, espacées d'au moins 8 px.
- Pas de défilement horizontal de la page à 360 px de large.

### 3.3 Logique existante à réutiliser (ne pas réécrire)

| Module | Ce qu'il fournit |
|---|---|
| `lib/domain/ventesStore.ts` | `useVentes()`, `ajouterVente()`, `supprimerToutes()`, `chargerExemple()` (stockage local) |
| `lib/domain/format.ts` | `formatFcfa`, `formatHeure`, `formatJour`, `cleJour` |
| `lib/fx/taux.ts` + `lib/useTaux.ts` | Cours BTC/FCFA, repli sur cache, `fcfaVersSats`. À modifier : appeler d'abord `GET /api/taux` (backend), puis CoinGecko en direct, puis le cache local |
| `lib/lightning/portefeuille.ts` + `WalletContext.tsx` | `useWallet()` : `portefeuille.creerFacture`, `attendrePaiement`, mode démo, connexion NWC |
| `lib/nostr/passeport.ts` | `construireContenu`, `signerPasseport`, `encoder`, `decoder`, `verifier`, `clePublique` |
| `lib/ia/analyserVente.ts` | `analyserVenteLocale` (remplaçable par l'appel backend `POST /api/ia/analyser`, voir le prompt backend) |
| `lib/useRoute.ts` | Routage par hash (`#/…`), `aller()` |

À ajouter dans `lib/` : `preferences.ts` (thème, sats visibles, plafond par vente, persistés en local avec repli si le stockage échoue), `useReseau.ts` (`navigator.onLine` + événements), `useAppareilModeste.ts` (voir 6.0).

## 4. Design tokens

### 4.1 Couleurs : thème clair (par défaut)

Les ratios sont mesurés (WCAG 2.1) et doivent figurer en commentaire à côté de chaque valeur.

```css
:root {
  --c-fond:            #F5F7F9; /* Warm Cloud : fond principal */
  --c-surface:         #FFFFFF; /* Pure White : cartes */
  --c-surface-2:       #FBFAF7; /* Soft Ivory : zones de respiration */
  --c-surface-h:       #EEF2F6; /* survol, appui, élément actif discret */
  --c-texte:           #172635; /* Midnight Ink : 14,3:1 sur fond, 15,4:1 sur blanc */
  --c-texte-doux:      #5B6B7B; /* CORRIGÉ (brief #647484 = 4,5:1 limite) : 5,1:1 sur fond */
  --c-bord:            #E3E9EF; /* Soft Border : décor uniquement */
  --c-bord-champ:      #8B97A3; /* 3,0:1 sur blanc : bordure des champs (minimum non-texte) */
  --c-primaire:        #18324A; /* Deep Navy : titres, navigation active, 12,3:1 */
  --c-primaire-cta:    #18324A; /* fond des boutons primaires */
  --c-sur-primaire:    #FFFFFF; /* 13,2:1 sur navy */
  --c-ambre:           #D99A45; /* Champagne Amber : ACCENT, jamais du texte (2,4:1) */
  --c-btc:             #F7931A; /* Bitcoin Orange : ACCENT, jamais du texte (2,3:1) */
  --c-sur-ambre:       #172635; /* texte sur fond ambre : 6,3:1 */
  --c-succes:          #16865B; /* fond plein « succès » avec texte blanc : 4,6:1 */
  --c-prouve-fond:     #E3F4EC; --c-prouve-texte:  #0F6B48; /* 5,7:1 */
  --c-declare-fond:    #FBF1E1; --c-declare-texte: #8A5A12; /* 5,3:1 */
  --c-erreur-fond:     #FDECEA; --c-erreur-texte:  #B42318; /* 5,7:1 */
  --ombre-1: 0 1px 2px rgb(23 38 53 / 0.06), 0 4px 12px rgb(23 38 53 / 0.05);
  --ombre-nav: 0 8px 24px rgb(23 38 53 / 0.10);
}
```

### 4.2 Couleurs : thème sombre (`:root[data-theme="sombre"]`)

```css
:root[data-theme="sombre"] {
  --c-fond: #101820;  --c-surface: #172433;  --c-surface-2: #1D2E40;  --c-surface-h: #22364B;
  --c-texte: #F3F6F8;      /* 16,5:1 */
  --c-texte-doux: #9EABB8; /* 7,6:1 sur fond, 6,7:1 sur surface */
  --c-bord: #2B3B4B;  --c-bord-champ: #6E7F90;
  --c-primaire: #F2B35C;   /* l'ambre devient l'accent principal en sombre : 9,7:1 */
  --c-primaire-cta: #F2B35C; --c-sur-primaire: #101820; /* 9,7:1 */
  --c-ambre: #F2B35C;  --c-btc: #F7931A;  --c-sur-ambre: #101820;
  --c-succes: #46B98A; /* 7,3:1 sur fond */
  --c-prouve-fond: #133A2C; --c-prouve-texte: #7FD8B0;
  --c-declare-fond: #3A2A0F; --c-declare-texte: #F5C97E;
  --c-erreur-fond: #3F1714; --c-erreur-texte: #FF9E96;
  --ombre-1: none; --ombre-nav: 0 8px 24px rgb(0 0 0 / 0.35);
}
```

Règles :
- Le thème est appliqué par `data-theme` sur `<html>` (`clair` par défaut). Il ne suit **pas** `prefers-color-scheme` (décision du brief). Le choix est stocké dans les préférences et appliqué **avant le premier rendu** (petit script inline dans `index.html`) pour éviter un flash.
- L'orange Bitcoin et l'ambre ne servent qu'aux accents : indicateur de navigation, liserés, éclat de la pièce, petites icônes décoratives. **Jamais** de texte ambre ou orange sur fond clair.
- Une information n'est jamais portée par la couleur seule : « Prouvé » / « Déclaré » sont toujours écrits.
- Vérifier chaque paire avec un script de contraste et noter le ratio en commentaire. Toute paire < 4,5:1 (texte) ou < 3:1 (icône, bordure de champ) est refusée.

### 4.3 Typographie

```css
--f-titre: "Plus Jakarta Sans Variable", "Manrope Variable", system-ui, sans-serif;
--f-texte: "Manrope Variable", system-ui, -apple-system, "Segoe UI", sans-serif;
/* Les montants utilisent --f-titre avec font-variant-numeric: tabular-nums. */
--t-montant: clamp(2.5rem, 11vw, 3rem); /* 40 à 48 px, graisse 700 */
--t-titre-ecran: 1.75rem;   /* 28 px, 700, interlettrage -0,02em */
--t-titre-section: 1.25rem; /* 20 px, 600 */
--t-sous-titre: 1rem;       /* 16 px, 500 */
--t-texte: 0.9375rem;       /* 15 px, 400, interligne 1,5 */
--t-secondaire: 0.8125rem;  /* 13 px, 400 : jamais en dessous */
--t-bouton: 1rem;           /* 16 px, 600 */
```

- Ne précharger que deux graisses du premier écran (Plus Jakarta 700, Manrope 400). `font-display: swap`.
- Tous les chiffres qui changent (montant, sats, compte à rebours, totaux) : `font-variant-numeric: tabular-nums` pour éviter les sauts.

### 4.4 Espacements, rayons, mouvement

```css
--e-1: 4px; --e-2: 8px; --e-3: 12px; --e-4: 16px; --e-5: 24px; --e-6: 32px; --e-7: 48px;
--rayon-s: 10px;  /* champs, pastilles carrées */
--rayon: 16px;    /* cartes, boutons, touches du pavé : UNE seule échelle */
--rayon-rond: 999px; /* pastilles, barre de navigation */
--cible-min: 48px;
--gouttiere: 16px; /* marge latérale des écrans */
--d-rapide: 140ms; --d-normale: 240ms; --d-lente: 420ms;
--ease-sortie: cubic-bezier(0.16, 1, 0.3, 1);
/* Ressort léger (dépassement ~4 %), sans bibliothèque : */
--ease-ressort: linear(0, 0.18 7%, 0.6 18%, 0.92 30%, 1.03 42%, 1.04 50%, 1.01 64%, 1);
```

Sous `@media (prefers-reduced-motion: reduce)`, toutes les durées passent à `0ms` et les animations de boucle sont désactivées.

## 5. Composants (bibliothèque)

Chaque composant : un fichier < 300 lignes, rendu < 30 lignes par fonction, variantes typées par union TS, aucun `#hex` ni durée en dur, accessibilité intégrée (labels liés, `aria-*`, focus visible). Tous apparaissent sur `#/apercu-design-system`.

| Composant | Spécification |
|---|---|
| `Button` | Variantes `primaire` (navy, texte blanc), `secondaire` (blanc, bordure `--c-bord-champ`), `discret` (texte navy), `danger`. Tailles `md` (48 px) et `lg` (56 px). Appui : `scale(0.98)` en `--d-rapide`. Libellé sur une ligne. État `chargement` : libellé remplacé par un texte d'état (« Création du QR code… »), bouton désactivé, `aria-busy`. |
| `Field` | Label au-dessus, aide, erreur sous le champ reliée par `aria-describedby`, `aria-invalid`. Jamais de placeholder seul. |
| `AmountDisplay` | Montant FCFA en `--t-montant`, chiffres tabulaires ; ligne secondaire « ≈ 12 345 sats » (si la préférence est active) ; mention « Cours du 18/11 à 14:32 » et « (dernier cours connu) » si cache. `aria-live="polite"`. |
| `NumericKeypad` | Grille 3 × 4 : 1-9, `00`, `0`, effacer (icône `Delete` + `aria-label="Effacer le dernier chiffre"`). Touches 64 px de haut (56 px si hauteur d'écran < 740 px), `--rayon`, fond `--c-surface`, bordure `--c-bord`. Appui : `scale(0.96)` + fond `--c-surface-h`. Appui long sur effacer = tout effacer. Retour haptique `navigator.vibrate(8)` si disponible. Plafond : préférence « Plafond par vente » (défaut 500 000 FCFA) ; au-delà, la touche ne fait rien et un message « Montant supérieur à votre plafond » apparaît. |
| `WalletStatus` | Pastille compacte : point + texte. États : `connecte` (« Portefeuille connecté », point vert), `demo` (« Mode démonstration », fond ambre clair), `deconnecte` (« Portefeuille non connecté », lien vers Réglages), `injoignable` (« Impossible de contacter votre portefeuille »). Le point est sémantique (seule exception à la règle « pas de points décoratifs »). |
| `PaymentQRCode` | QR généré localement, fond blanc forcé, 280 × 280 px (≥ 240 px sur petit écran), marge 1 module, niveau de correction L, préfixe `lightning:` + facture en MAJUSCULES. Apparition : fondu 160 ms, **jamais** de délai avant affichage. |
| `PaymentStatus` | `attente` (« En attente du paiement… » + anneau de progression du compte à rebours), `confirme`, `expire` (« Cette demande de paiement a expiré. »), `erreur`. Région `aria-live`. |
| `Countdown` | « Expire dans 9:42 », chiffres tabulaires ; passe en `--c-erreur-texte` sous 60 s. |
| `TransactionCard` | Ligne : libellé, montant à droite (tabulaire), méta : pastille Prouvé/Déclaré + heure. Touchable (ouvre le détail). Pas d'ombre ; bordure `--c-bord`. |
| `TransactionList` | Groupes par jour (« Aujourd'hui », « Hier », puis « lundi 16 novembre »), en-tête collant discret. Au-delà de 200 lignes : rendu par tranches de 50 (bouton « Afficher plus »). |
| `StatCard` | Valeur (tabulaire, 24 px, `--f-titre`), libellé 13 px, variation optionnelle. Les valeurs qui changent font un fondu de 140 ms, sans défilement de chiffres. |
| `MiniBarChart` | 7 barres CSS (une par jour), hauteur proportionnelle, barre du jour en navy, autres en `--c-bord-champ`, valeur au toucher. `role="img"` + `aria-label` qui résume (« Ventes des 7 derniers jours, maximum mardi : 45 500 FCFA »). |
| `Segmented` | Groupe de boutons `aria-pressed`, défilable horizontalement si trop large, sélection = fond navy texte blanc. |
| `Switch` | `role="switch"` + `aria-checked`, 52 × 32 px, pastille qui glisse en `--ease-ressort`. |
| `Badge` | `prouve`, `declare`, `neutre`, `ambre`. Texte toujours présent. |
| `Toast` | En haut, sous la zone sûre, 4 s, `role="status"` (ou `alert` pour les erreurs), une seule à la fois. |
| `Modal` / `Sheet` | Feuille du bas sur mobile (poignée, glisser vers le bas pour fermer), boîte centrée ≥ 768 px. Focus piégé, `Échap` ferme, retour du focus à l'élément d'origine. |
| `EmptyState` | Titre + phrase qui dit quoi faire + action. |
| `Skeleton` | Forme du contenu final, reflet animé uniquement si le mouvement est autorisé. |
| `OfflineBanner` | Bandeau fin sous l'en-tête : « Votre connexion Internet semble instable. » quand `navigator.onLine` est faux ou qu'un appel échoue deux fois de suite. |
| `BottomNavigation` | Section 6.2. |
| `CoinFcfa` | Section 6.1. |
| `RibbonBackground` | Section 6.3. |

## 6. Animations signature (à reproduire fidèlement)

### 6.0 Règles communes
- Hook `useAppareilModeste()` : vrai si `navigator.hardwareConcurrency <= 4`, ou `navigator.deviceMemory <= 2`, ou `navigator.connection?.saveData`. Dans ce cas : pas de fond animé, pas de flou de mouvement, pièce en rotation simplifiée.
- `prefers-reduced-motion: reduce` : aucune boucle, aucune rotation ; états finaux affichés directement.
- Toute boucle est mise en pause quand `document.hidden` (événement `visibilitychange`) ou quand l'élément sort de l'écran (`IntersectionObserver`).
- Jamais d'écouteur `scroll` sur `window` ; jamais de `useState` mis à jour à chaque image.

### 6.1 `CoinFcfa` : la pièce en verre qui tourne

**Références** : `assets/animation_coin_movement.webm` (mouvement), `assets/references/piece_rotation_planche.jpg` (images toutes les 250 ms), `assets/references_coin_to_put_Dakar_currency_sign.png` (apparence : verre translucide, liseré lumineux vert-turquoise, symbole en relief au centre).

**Apparence (d'après le PNG)**
- Disque de 160 px (taille paramétrable `taille`), épaisseur visuelle 12 px.
- Face : verre translucide. Fond `radial-gradient(circle at 35% 28%, rgb(255 255 255 / .35), transparent 42%)` sur `linear-gradient(135deg, rgb(70 185 138 / .28), rgb(22 134 91 / .10) 55%, rgb(102 252 241 / .22))`.
- Liseré extérieur : anneau de 4 px `rgb(150 255 215 / .75)`, avec lueur `0 0 22px rgb(70 185 138 / .65)` et lueur intérieure `inset 0 0 18px rgb(255 255 255 / .25)`.
- Anneau intérieur fin à 82 % du diamètre, `rgb(200 255 235 / .35)`.
- Texte circulaire entre les deux anneaux (SVG `<textPath>`, 9 px, lettres espacées 0,2em, `rgb(220 255 240 / .8)`) : `CAISSE LIGHTNING • DAKAR • FRANC CFA •`.
- Centre de la **face avant** : la marque FCFA, un « F » majuscule en Plus Jakarta Sans 800 avec une seconde barre horizontale (comme ₣), surmonté du petit mot « CFA » (10 px, 700, espacé), le tout en relief : couleur `rgb(225 255 245 / .9)`, `text-shadow: 0 1px 0 rgb(255 255 255 / .5), 0 -1px 1px rgb(0 60 40 / .5)`.
- Centre de la **face arrière** : un éclair (icône Lucide `Zap`, trait 2) dans le même relief.
- Tranche : 10 disques empilés en `translateZ` de -6 à +6 px, couleur `rgb(70 185 138 / .55)`, qui ne se voient que de profil (la tranche striée de la vidéo).
- Scène : la pièce est posée sur un **médaillon sombre** (`#0E1A24`, dégradé radial vers `#101820`, rayon 24 px, 220 × 220 px) pour garder l'effet du PNG sur fond noir, même dans le thème clair.

**Mouvement (d'après la vidéo, cycle de 4,8 s)**

| Temps | État (rotation Y) | Détail |
|---|---|---|
| 0,00 s | 90° (pièce de profil) | seule la tranche est visible |
| 0,25 → 0,75 s | 70° → 20° | la face avant tourne vers l'écran |
| 1,00 s | 0° (face) | **éclat** : halo blanc doré en haut à gauche (cercle flou, opacité 0 → 0,9 → 0) + halo général qui s'élargit |
| 1,00 → 2,00 s | 0° → -15° → 0° | léger balancement sur la face ; second éclat plus faible à 1,75 s en haut au centre |
| 2,25 → 3,00 s | -40° → -90° | retour de profil |
| 3,25 → 4,00 s | -110° → -180° | la face arrière arrive |
| 4,00 → 4,75 s | -180° | éclat sur la face arrière, puis enchaînement vers 270° = 90° (boucle) |

- Implémentation : `@keyframes coin-rotation` sur `.piece__corps` (`transform-style: preserve-3d`, parent avec `perspective: 900px`), avec un `animation-timing-function: cubic-bezier(.45,.05,.35,1)` par segment (ralenti sur les faces, accéléré de profil, comme la vidéo).
- L'éclat est un pseudo-élément `::after` dans le plan de la face (`radial-gradient` blanc doré), animé en opacité par un `@keyframes` synchronisé.
- Les deux faces ont `backface-visibility: hidden`.

**Variantes d'usage**
- `mode="boucle"` : cycle complet ci-dessus, en continu (écran Bienvenue).
- `mode="entree"` : écran Paiement reçu. Arrivée de profil, 1,5 tour décéléré en 1 200 ms, arrêt **face avant** avec un éclat, puis balancement de ±10° toutes les 3 s. Ne retarde jamais l'affichage du montant reçu.
- Mouvement réduit ou appareil modeste : face avant fixe, éclat statique.

### 6.2 `BottomNavigation` : dock incurvé avec indicateur « liquid glass »

**Références** :
- Indicateur : `assets/liquid_glass_animation_ref_switch_colour.webm` et `assets/references/navigation_liquid_glass_planche.png` (images toutes les 200 ms de la transition).
- Disposition en arc et balayage : `assets/nagivationbar scrolling animation.webm` et `assets/references/navigation_arc_planche.jpg`.

**Structure**
- Barre flottante : `position: fixed`, à 12 px du bas + `env(safe-area-inset-bottom)`, 16 px des bords, hauteur 72 px, `--rayon-rond`.
- Fond « verre » : `rgb(255 255 255 / .72)`, `backdrop-filter: blur(16px) saturate(1.4)`, bordure 1 px `rgb(227 233 239 / .9)`, ombre `--ombre-nav`, reflet `inset 0 1px 0 rgb(255 255 255 / .8)`. En sombre : `rgb(23 36 51 / .72)`, bordure `--c-bord`. Repli sans `backdrop-filter` ou avec `prefers-reduced-transparency` : fond plein `--c-surface`.
- 4 onglets, chacun un `<a href="#/…">` avec icône Lucide + libellé 12 px 600, `aria-current="page"` sur l'actif.

| Ordre | Onglet | Icône Lucide | Route |
|---|---|---|---|
| 1 | Accueil | `House` | `#/` |
| 2 | Ventes | `ReceiptText` | `#/ventes` |
| 3 | Passeport | `ShieldCheck` | `#/passeport` |
| 4 | Réglages | `Settings` | `#/reglages` |

**Indicateur liquid glass (reproduction de la vidéo, recoloré en ambre)**
- Pastille derrière l'onglet actif : 68 × 56 px, rayon 28 px.
- Matière : `linear-gradient(180deg, rgb(242 194 122 / .55), rgb(217 154 69 / .38))`, reflet `radial-gradient(ellipse at 50% 18%, rgb(255 255 255 / .75), transparent 55%)`, lueur `0 0 18px rgb(217 154 69 / .45)`, liseré `inset 0 0 0 1px rgb(255 255 255 / .55)`, ombre intérieure basse `inset 0 -6px 12px rgb(217 154 69 / .25)`. Aucun `backdrop-filter` sur la pastille.
- **Étirement liquide** (ce que montre la vidéo à 1,8 s et 4,6 s : la pastille devient une capsule qui couvre l'ancien et le nouvel onglet, puis se rétracte) : la pastille est positionnée par deux variables `--bord-gauche` et `--bord-droit`. Au changement d'onglet :
  - le **bord avant** (côté destination) transite en **220 ms** `--ease-sortie` ;
  - le **bord arrière** transite en **380 ms** `--ease-ressort`, avec 40 ms de délai ;
  - pendant l'étirement, la hauteur passe à 60 px (`scaleY(1.07)`) puis revient.
  - Résultat : capsule étirée vers 120 ms, cercle reformé vers 420 ms.
- Icône active : couleur `--c-primaire`, trait 2,25 et `fill="currentColor"` à 15 % d'opacité (`fill-opacity`), libellé navy 700. Icônes inactives : `--c-texte-doux`, trait 1,75, sans remplissage. Le passage contour → plein se fait en 160 ms quand la pastille arrive.
- Les icônes recouvertes pendant l'étirement prennent la teinte ambre foncé `#8A5A12` (mélange visible dans la vidéo).

**Disposition en arc et balayage (reproduction de la vidéo de navigation, adaptée à 4 onglets)**
- Variable continue `--progression` = index de l'onglet actif (0 à 3), fractionnaire pendant un glissement.
- Pour chaque onglet `i`, avec `d = i - progression` :
  - `translateY = d² × 5 px` (les onglets éloignés descendent : effet d'arc) ;
  - `rotate = d × 5 deg` (tangente à l'arc, comme les icônes inclinées de la vidéo) ;
  - `scale = 1.12` à `d = 0`, décroissant de 0,07 par unité de distance (minimum 0,92) ;
  - `opacity = 1` à `d = 0`, puis `max(0.72, 1 - |d| × 0.14)` : les icônes latérales restent identifiables (contraste ≥ 3:1 vérifié avec l'opacité).
- **Balayage horizontal** sur le contenu de la page (pas sur la barre) : gestes pointeur avec verrouillage d'axe (si l'angle initial dépasse 30° de l'horizontale, c'est un défilement vertical et on n'intervient pas). Pendant le glissement, `--progression` suit le doigt et la page glisse latéralement (`translateX`), la page voisine entrant par le côté. Au relâchement : changement d'onglet si le déplacement dépasse 25 % de la largeur ou la vitesse 0,5 px/ms, sinon retour. Animation finale : 320 ms `--ease-ressort`.
- **Flou de mouvement** (vidéo, images de 0,25 à 0,75 s) : pendant un balayage rapide uniquement, `filter: blur(min(vitesse × 2, 2.5) px)` sur les icônes **non actives** ; retour à 0 en 120 ms. Désactivé si mouvement réduit ou appareil modeste.
- Les variables sont écrites dans `style` d'une ref dans `requestAnimationFrame`, jamais via `useState`.
- Le tap reste toujours possible ; les zones tactiles (48 × 48 minimum) **ne bougent pas** : seules les icônes à l'intérieur se transforment.
- Mouvement réduit : pas d'arc, pas de rotation, pas de balayage ; l'indicateur saute instantanément.
- La barre est **masquée** sur les écrans de flux (Paiement, Paiement reçu, Vente déclarée, Bienvenue, Connexion, Sauvegarde de la clé, Vue prêteur).

### 6.3 `RibbonBackground` : rubans brillants

**Références** : `assets/references_background_animation.webm` (mouvement : rubans courbes qui pivotent et glissent lentement, liserés de couleur sur les arêtes), `assets/references/fond_ruban_planche.jpg`, et `assets/reference_for_background_must_follow_palette.png` (forme : pétales superposés à la façon d'une fleur ; **les couleurs doivent suivre la palette**).

**Dessin** : un SVG plein cadre (`preserveAspectRatio="xMidYMid slice"`) de 4 à 6 rubans/pétales courbes superposés, ancrés en bas à droite, chacun rempli d'un dégradé linéaire et bordé d'un liseré de 1,5 px.

| Thème | Fond | Rubans (du fond vers l'avant) | Liserés |
|---|---|---|---|
| Clair | dégradé `#EAF0F6` → `#F5F7F9` | `#18324A` → `#24496B` → `#2F5E8C` → `#4A86C5`, opacités 0,85 à 1 | `#F2B35C` à 60 % (ambre), un seul liseré `#F7931A` à 50 % |
| Sombre | `#101820` | `#1D2E40` → `#24496B` → `#2B5C8F` → `#3D7BC0` | `#F7931A` à 70 % et `#F2B35C` à 50 % (les reflets orangés de la vidéo) |

**Mouvement** : chaque ruban a son `@keyframes` (rotation de ±4°, translation de ±14 px, `scale` 1 → 1,03), durée 16 à 24 s, `alternate`, `ease-in-out`, décalages différents. Le tout donne l'ondulation lente de la vidéo, sans à-coup.

**Où** :
- Écran Bienvenue : plein écran derrière le contenu, avec un voile `--c-fond` à 70 % sous le texte pour garder le contraste.
- Accueil : bandeau haut de 180 px seulement, fondu vers `--c-fond` par un masque `linear-gradient(to bottom, #000 55%, transparent)`. **Jamais** derrière le montant, le pavé, le QR ou un texte de statut.
- Pas de `filter: blur` (coûteux) : la douceur vient des dégradés.
- Appareil modeste, économie de données ou mouvement réduit : SVG statique.

## 7. Navigation, routes et coque

| Route | Écran | Barre du bas |
|---|---|---|
| `#/bienvenue` | E0 Bienvenue (première ouverture seulement) | non |
| `#/connexion` | E1 Connexion du portefeuille | non |
| `#/cle` | E2 Sauvegarde de la clé | non |
| `#/` | E3 Accueil / caisse | oui |
| `#/paiement` | E4 Faire payer le client | non |
| `#/recu` | E5 Paiement reçu | non |
| `#/declarer` | E6 Vente en espèces ou Wave | non |
| `#/ventes` | E7 Historique | oui |
| `#/ventes/<id>` | E8 Détail d'une vente (feuille du bas) | oui |
| `#/passeport` | E9 Activité et passeport | oui |
| `#/reglages` | E11 Réglages | oui |
| `#/preteur/<charge>` | E12 Vue prêteur (lien long, sans backend) | non (page autonome) |
| `#/preteur/p/<id>` | E12 Vue prêteur (lien court, charge lue via `GET /api/passeports/:id`) | non (page autonome) |
| `#/apercu-design-system` | Aperçu interne | non |

- Le bouton retour d'Android doit fonctionner partout (le hash change à chaque écran de flux).
- Le paiement en cours n'est **jamais** perdu par un retour accidentel : sur E4, le retour ouvre une confirmation « Annuler cette demande de paiement ? ».
- Première ouverture (aucune préférence enregistrée) : redirection vers `#/bienvenue`.
- Desktop ≥ 1024 px : même contenu centré dans une colonne de 480 px ; la barre du bas devient une barre latérale gauche verticale avec le même indicateur (arc désactivé). Historique en 2 colonnes (liste + détail).

## 8. Écrans

Format de chaque fiche : objectif, maquette (390 × 844), textes exacts, composants, états, interactions, critères d'acceptation. Les textes entre guillemets sont **exacts** (ne pas reformuler). Aucun jargon visible du commerçant : pas de « invoice », « NWC », « hash », « relay », « sats » hors de la ligne d'équivalence.

### E0. Bienvenue (`#/bienvenue`)

**Objectif** : donner envie en 5 secondes et lancer la configuration.

```
┌──────────────────────────────┐
│   [RibbonBackground plein]   │
│                              │
│        ┌──────────┐          │
│        │ CoinFcfa │ boucle   │
│        └──────────┘          │
│ Votre téléphone devient      │
│ votre caisse Lightning.      │
│ Créez un QR code, recevez…   │
│ ⚡ Paiements rapides          │
│ ✓ Simple à utiliser          │
│ ▤ Vos ventes réunies         │
│ ┌──────────────────────────┐ │
│ │       Commencer          │ │
│ └──────────────────────────┘ │
│   Essayer en mode démonstration│
└──────────────────────────────┘
```

- Titre (28 px) : « Votre téléphone devient votre caisse Lightning. »
- Texte : « Créez un QR code, recevez vos paiements en Bitcoin et retrouvez toutes vos ventes au même endroit. Une caisse simple, rapide et pensée pour les petits commerces. »
- Trois arguments (icônes `Zap`, `CircleCheck`, `ReceiptText`) : « Paiements rapides », « Simple à utiliser », « Vos ventes réunies ».
- Bouton primaire `lg` : « Commencer » → E1. Lien discret : « Essayer en mode démonstration » → active le mode démo, enregistre la préférence, → E3.
- Pièce : `CoinFcfa mode="boucle"` 140 px.
- Critères : tout tient sans défilement à 390 × 844 ; contraste du texte sur le voile ≥ 4,5:1.

### E1. Connexion du portefeuille (`#/connexion`)

**Objectif** : connecter Alby Hub ou LNbits avec les **permissions minimales**.

- Titre : « Connecter mon portefeuille »
- Texte : « Votre portefeuille reçoit l'argent. La caisse peut seulement créer des demandes de paiement : elle ne peut jamais dépenser. »
- Étape 1, carte : « Ouvrez Alby Hub, créez une connexion d'application et copiez le lien. » + bouton secondaire « Ouvrir Alby Hub » (`target="_blank"`, `rel="noopener"`). Si le SDK le permet, proposer d'abord « Créer la connexion automatiquement » via l'URL d'autorisation NWC avec `requestMethods: ["make_invoice","lookup_invoice","get_info"]`, `notificationTypes: ["payment_received"]`, `name: "Caisse Lightning"`.
- Étape 2 : `Field` « Lien de connexion » (type `password`, bouton œil pour afficher, `autocomplete="off"`), aide « Il commence par nostr+walletconnect:// et reste sur ce téléphone. »
- Bouton primaire : « Connecter mon portefeuille ». En cours : « Vérification… ». La connexion est testée (`get_info`), avec 8 s maximum.
- Succès : toast « Votre portefeuille est connecté. », puis E2 si aucune clé n'a été sauvegardée, sinon E3.
- Erreurs : lien mal formé → « Ce lien de connexion n'est pas valide. Copiez-le à nouveau depuis votre portefeuille. » ; délai dépassé → « Impossible de contacter votre portefeuille. » + bouton « Réessayer ». Si le portefeuille annonce une méthode de paiement (`pay_invoice`) dans `get_info().methods`, avertir : « Cette connexion peut dépenser votre argent. Créez-en une limitée à la réception. » (bouton « Continuer quand même » secondaire).
- Le lien n'est jamais journalisé ni envoyé à un serveur.

### E2. Sauvegarde de la clé (`#/cle`)

**Objectif** : ne pas perdre l'identité qui signe le passeport.

- Titre : « Sauvegardez votre clé »
- Texte : « Ces 12 mots signent votre passeport de revenus. Notez-les sur papier. Sans eux, un téléphone perdu ou un navigateur effacé fait perdre votre historique de preuve. »
- Grille 2 × 6 de mots numérotés (police texte 16 px, `user-select: none` pendant l'affichage), générés avec `nostr-tools/nip06` (la clé de `lib/nostr/passeport.ts` doit alors dériver de ces mots ; adapter `lireOuCreerCle` sans changer son interface).
- Case à cocher obligatoire : « J'ai noté mes 12 mots en lieu sûr. »
- Bouton primaire : « Continuer » (désactivé tant que la case n'est pas cochée). Lien : « Le faire plus tard » (rappel dans Réglages, pastille ambre « À faire »).
- Jamais de copie dans le presse-papiers des mots, jamais de capture automatique.

### E3. Accueil / caisse (`#/`) : écran principal

**Objectif** : encaisser en trois gestes. Montant et action visibles dès l'ouverture.

```
┌──────────────────────────────┐
│ [rubans, bandeau 180 px]     │
│ Bonjour !        ● Connecté  │
│ Prêt à encaisser votre       │
│ prochaine vente ?            │
│ Aujourd'hui : 3 ventes · 45 500 FCFA │
├──────────────────────────────┤
│ Quel montant souhaitez-vous  │
│ encaisser ?                  │
│        12 500 FCFA           │
│      ≈ 18 940 sats           │
│  ┌────┐ ┌────┐ ┌────┐        │
│  │ 1  │ │ 2  │ │ 3  │  ...   │
│  (pavé 3×4)                  │
│ ┌──────────────────────────┐ │
│ │    Créer un QR code      │ │
│ └──────────────────────────┘ │
│   Vente en espèces ou Wave   │
│  ( dock : Accueil Ventes … ) │
└──────────────────────────────┘
```

- En-tête : « Bonjour ! » (28 px) + `WalletStatus` à droite ; sous-titre « Prêt à encaisser votre prochaine vente ? » ; ligne « Aujourd'hui : N ventes · X FCFA » (masquée s'il n'y a aucune vente).
- Bloc montant : libellé « Quel montant souhaitez-vous encaisser ? » (13 px, texte doux), `AmountDisplay` (affiche « 0 FCFA » en texte doux quand vide).
- `NumericKeypad`.
- Bouton primaire `lg` pleine largeur : « Créer un QR code ». Désactivé si montant nul, portefeuille déconnecté ou cours indisponible ET absent du cache. En cours : « Création du QR code… ».
- Bouton discret : « Vente en espèces ou Wave » → E6.
- États :
  - Portefeuille non connecté : bandeau info « Connectez votre portefeuille pour encaisser en Lightning. » + lien « Connecter » ; le pavé reste utilisable (pour E6).
  - Cours en cache : « Cours du 18/11 à 14:32 (dernier cours connu) ».
  - Cours indisponible et aucun cache : « Cours indisponible. Connectez-vous une fois pour l'enregistrer. »
  - Montant invalide : « Veuillez saisir un montant valide. »
  - Hors ligne : `OfflineBanner`.
- Critères : à 390 × 844, l'ensemble (en-tête, montant, pavé, bouton, lien, dock) tient **sans défilement** ; à 360 × 740, le pavé passe en touches de 56 px et tout tient encore.

### E4. Faire payer le client (`#/paiement`)

**Objectif** : montrer le QR et attendre la **vraie** confirmation du portefeuille.

- Titre : « Faire payer le client » ; texte : « Présentez ce QR code à votre client pour qu'il puisse payer. »
- `PaymentQRCode` centré (affiché **immédiatement** dès que la facture existe).
- Montant FCFA (32 px, tabulaire), équivalent « ≈ 18 940 sats », `Countdown` « Expire dans 9:42 ».
- `PaymentStatus` : « En attente du paiement… » avec un anneau fin qui se vide (compte à rebours), aucune animation qui suggère un succès.
- Boutons : secondaire « Copier la facture » (toast « Facture copiée »), discret « Annuler » (confirmation si paiement en attente).
- Mode démo : pastille ambre « Mode démonstration : le paiement sera simulé ».
- Expiration : statut « Cette demande de paiement a expiré. » + bouton primaire « Créer un nouveau QR code » (même montant).
- Erreur portefeuille : « Impossible de contacter votre portefeuille. » + « Réessayer ».
- Garde-fous : l'écran ne passe en succès **que** lorsque `attendrePaiement` résout (préimage reçue). L'écran reste allumé (`navigator.wakeLock` si disponible, relâché en sortie).
- Critères : temps entre l'appui sur « Créer un QR code » et l'affichage du QR ≤ temps de réponse du portefeuille + 100 ms ; aucun texte de succès avant confirmation.

### E5. Paiement reçu (`#/recu`)

```
┌──────────────────────────────┐
│ ┌──────────────────────────┐ │
│ │  médaillon sombre        │ │
│ │     CoinFcfa (entrée)    │ │
│ └──────────────────────────┘ │
│      Paiement reçu !         │
│ Votre vente a été confirmée  │
│ avec succès.                 │
│        12 500 FCFA           │
│      18 940 sats  [Prouvé]   │
│ 18 nov. 2026 à 14:35         │
│ Réf. 3f9a…c21                │
│ ┌──────────────────────────┐ │
│ │      Nouvelle vente      │ │
│ └──────────────────────────┘ │
│      Voir l'historique       │
└──────────────────────────────┘
```

- Arrivée : fondu du fond en `--c-prouve-fond` (240 ms), `CoinFcfa mode="entree"`, vibration 200 ms, montant affiché **dès la première image**.
- Titre : « Paiement reçu ! » ; texte : « Votre vente a été confirmée avec succès. »
- Détails : montant, sats, date et heure, « Réf. » = 4 premiers et 3 derniers caractères du hash de paiement, `Badge` « Prouvé ».
- Boutons : primaire « Nouvelle vente » (→ E3 montant remis à zéro), secondaire « Voir l'historique » (→ E7). Bonus : discret « Envoyer un reçu au client ».
- Lecteur d'écran : annonce « Paiement reçu avec succès ! 12 500 FCFA ».

### E6. Vente en espèces ou Wave (`#/declarer`)

**Objectif** : noter une vente hors Lightning, avec confirmation obligatoire.

- Titre : « Vente en espèces ou Wave » ; texte : « Écrivez la vente comme vous la diriez. »
- `Field` « Que s'est-il vendu ? », aide « Exemple : 2 sacs de riz, 15 000 », 120 caractères maximum. À côté, bouton micro désactivé avec infobulle « Bientôt : dictée en wolof » (bonus).
- Choix du moyen : `Segmented` « Espèces » / « Wave » / « Autre » (stocké dans le libellé ou un champ dédié).
- Bouton secondaire : « Analyser ». L'analyse appelle `POST /api/ia/analyser` si le backend répond, sinon `analyserVenteLocale` (aucune différence visible, sauf la mention « Analyse hors ligne » en texte doux).
- Proposition (carte) : `Field` « Article », `Field` « Montant en FCFA » (`inputmode="numeric"`), phrase « Cette vente sera marquée [Déclaré] : elle compte moins qu'un paiement prouvé. »
- Bouton primaire : « Enregistrer 15 000 FCFA ». Puis toast « Vente enregistrée » et retour à E3.
- Erreurs : pas de montant trouvé → « Je n'ai pas trouvé de montant. Exemple : 2 sacs de riz, 15 000 » ; montant invalide → « Veuillez saisir un montant valide. ».

### E7. Historique des ventes (`#/ventes`)

- Titre : « Historique des ventes » ; texte : « Retrouvez toutes vos transactions au même endroit. »
- `Segmented` défilable : « Aujourd'hui », « Cette semaine », « Ce mois », « Toutes les ventes » (défaut : Aujourd'hui s'il y a des ventes, sinon Toutes).
- Deux `StatCard` côte à côte : « Prouvé » (fond `--c-prouve-fond`) et « Déclaré » (fond `--c-declare-fond`), avec le nombre de ventes.
- `TransactionList` groupée par jour.
- Bouton secondaire en bas : « Exporter l'historique » (CSV : date ISO, montant, type, libellé, référence ; nom `ventes-AAAA-MM-JJ.csv`).
- Vide : « Vos ventes apparaîtront ici. » + bouton secondaire « Charger des données d'exemple » (ventes **déclarées** uniquement).
- Filtre vide : « Aucune vente sur cette période. »

### E8. Détail d'une vente (feuille du bas sur E7)

- Montant (32 px), libellé, date et heure complètes, `Badge` Prouvé/Déclaré, moyen (Lightning, Espèces, Wave).
- Si prouvée : « Réf. » courte + bouton discret « Copier la preuve » (copie la préimage, pour l'agent de microfinance qui la demanderait).
- Si contresignée (bonus) : ligne « Confirmée par le client ».
- Fermeture : glisser vers le bas, bouton « Fermer », touche Échap.

### E9. Activité et passeport (`#/passeport`)

**Objectif** : voir son activité et produire la preuve de revenus.

- Titre : « Mon passeport » ; texte : « Une preuve de vos revenus, que l'agent de microfinance peut vérifier lui-même. »
- Section « Mon activité » :
  - 4 `StatCard` en grille 2 × 2 : « Ventes sur 30 jours » (FCFA), « Nombre de ventes », « Panier moyen », « Part prouvée » (%).
  - `MiniBarChart` des 7 derniers jours.
- Section « Mon passeport de revenus » :
  - `Segmented` « 7 jours », « 30 jours », « 90 jours » (défaut 30).
  - Carte : total de la période, « dont X FCFA prouvés (N) et Y FCFA déclarés (M) ».
  - Ligne d'aide : « Plus la part prouvée est grande, plus votre passeport est solide. »
  - Bouton primaire `lg` : « Générer mon passeport ».
- Carte « Résumé du jour » (sous les statistiques) : texte de `POST /api/ia/resume` à partir des chiffres agrégés du jour ; repli sur une phrase construite localement si le backend ne répond pas ; masquée s'il n'y a aucune vente aujourd'hui.
- Après génération : le front appelle `POST /api/passeports` avec la charge signée ; en cas de succès il utilise le **lien court** `#/preteur/p/<id>`, sinon le lien long `#/preteur/<charge>`. Puis **feuille du bas** « Passeport signé » :
  - texte « Montrez ce code ou envoyez le lien à l'agent de microfinance. » ;
  - QR du lien (toujours possible avec le lien court) ; avec le lien long, QR seulement si ≤ 1 800 caractères, sinon « Votre passeport est trop détaillé pour un code QR. Envoyez le lien. » ;
  - mention « Lien valable 30 jours » pour le lien court ;
  - boutons « Partager » (Web Share API si disponible, sinon masqué), « Copier le lien » (devient « Lien copié ») ;
  - date de génération.
- Vide : « Pas encore de ventes » + « Enregistrez quelques ventes : votre passeport se construit à partir d'elles. »
- Rappel si la clé n'est pas sauvegardée : bandeau ambre « Sauvegardez votre clé pour ne pas perdre vos preuves. » + lien vers E2.

### E11. Réglages (`#/reglages`)

Liste groupée (titres de section 20 px), lignes de 56 px avec icône, libellé, valeur ou contrôle à droite.

- **Portefeuille Lightning** : `WalletStatus` détaillé ; bouton « Connecter mon portefeuille » (→ E1) ou « Déconnecter » (confirmation) ; « Mode démonstration » (`Switch`).
- **Préférences** :
  - « Apparence » : `Segmented` « Clair » / « Sombre » (application immédiate, transition de couleurs 240 ms).
  - « Afficher l'équivalent en sats » : `Switch` (activé par défaut).
  - « Langue » : « Français » ; ligne « Wolof (bientôt) » désactivée.
- **Sécurité** :
  - « Plafond par vente » : `Field` numérique en FCFA (défaut 500 000), validé (> 0, ≤ 10 000 000).
  - « Sauvegarder ma clé » (→ E2), pastille « À faire » si non fait.
  - « Restaurer avec mes 12 mots » (feuille du bas, 12 champs).
  - « Mon identité de signature » : 8 premiers caractères de la clé publique.
- **Données** : « Exporter l'historique », « Effacer mes ventes » (bouton danger, confirmation explicite « Effacer N ventes de ce téléphone ? »).
- **À propos** : version, lien vers le dépôt, « Projet du Dakar Bitcoin Hack 2026 ».

### E12. Vue prêteur (`#/preteur/<charge>`)

**Objectif** : permettre à l'agent de microfinance de vérifier en 1 minute, **sans compte ni installation**.

- Page autonome, thème clair forcé, colonne de 480 px max, sans barre de navigation.
- En-tête : petit logo + « Caisse Lightning » + titre « Vérification d'un passeport de revenus ».
- Bandeau d'état en tête : succès « Signature valide : ce relevé n'a pas été modifié depuis sa signature. » ou erreur « Signature invalide : ne vous fiez pas à ces chiffres. ».
- Bloc période : « Sur 30 jours » + total (32 px).
- Deux `StatCard` : « Prouvé : N paiements vérifiés » et « Déclaré : M ventes ».
- Alerte si preuves rejetées : « N preuve(s) de paiement rejetée(s). Elles ne comptent pas dans le total prouvé. »
- Section « Plafond de prêt indicatif » : deux valeurs (« 20 % du flux mensuel estimé » et « en ne comptant que le prouvé ») + alerte info « Indicatif, non contraignant. La décision de crédit reste la vôtre. »
- Section « Ce qui a été vérifié » : liste à icônes (`CircleCheck` / `TriangleExclamationPoint`) : signature de l'auteur (8 premiers caractères), préimages des paiements, et ce qui **n'est pas** vérifié (ventes déclarées, auto-paiement possible : « comparez avec ce que vous voyez sur place »).
- États : chargement (squelettes), lien illisible (« Le lien est incomplet ou abîmé. Demandez au commerçant de le renvoyer. »).
- Bouton « Imprimer » (`window.print()`, feuille de style d'impression sans fond animé).

### E13. Reçu client (bonus, `#/recu-client/<charge>`)

- Page autonome : montant, commerçant (identité courte), date, « Paiement prouvé ».
- Bouton « Confirmer cet achat » : signature Nostr du client (extension NIP-07 si présente, sinon clé éphémère), renvoyée au commerçant. Après : « Merci, votre confirmation a été enregistrée. »

### E14. Mon équipe (bonus, `#/equipe`, accessible depuis Réglages)

- Liste des vendeurs (nom, plafond du jour, utilisé), bouton « Ajouter un vendeur » (nom, plafond journalier en FCFA) → QR et lien de connexion à budget limité, bouton « Révoquer » (confirmation).

## 9. PWA

- `vite-plugin-pwa`, stratégie `generateSW` :
  - précache de la coque (HTML, JS, CSS, polices des deux graisses principales, icônes) ;
  - `NetworkFirst` (délai 4 s) pour l'API de cours ; aucun cache des réponses portant une facture.
- Manifeste : `name` « Caisse Lightning », `short_name` « Caisse », `lang` « fr », `display` « standalone », `orientation` « portrait », `background_color` `#F5F7F9`, `theme_color` `#18324A`, icônes 192, 512 et 512 « maskable » (PNG) + SVG.
- `<meta name="theme-color">` mis à jour selon le thème.
- Invite d'installation : écouter `beforeinstallprompt` ; après la 2e vente, une carte discrète sur E3 « Installer la caisse sur l'écran d'accueil » (bouton « Installer », lien « Plus tard », mémorisé). iOS : feuille d'explication « Touchez Partager puis Sur l'écran d'accueil ».
- Mise à jour : quand un nouveau service worker est prêt, toast « Une nouvelle version est disponible » + bouton « Mettre à jour ».
- Hors ligne au démarrage : l'application s'ouvre, l'historique, le passeport et la saisie des ventes déclarées fonctionnent ; « Créer un QR code » est désactivé avec « Connexion nécessaire pour encaisser en Lightning. ».

## 10. Messages système (textes exacts)

| Situation | Message |
|---|---|
| Portefeuille connecté | « Votre portefeuille est connecté. » |
| Paiement en attente | « En attente de confirmation… » |
| Paiement reçu | « Paiement reçu avec succès ! » |
| Facture expirée | « Cette demande de paiement a expiré. » |
| Erreur de connexion | « Impossible de contacter votre portefeuille. » |
| Montant invalide | « Veuillez saisir un montant valide. » |
| Historique vide | « Vos ventes apparaîtront ici. » |
| Connexion faible | « Votre connexion Internet semble instable. » |
| Plafond dépassé | « Montant supérieur à votre plafond. Modifiez-le dans Réglages. » |
| Copie réussie | « Facture copiée » / « Lien copié » |
| Vente déclarée enregistrée | « Vente enregistrée » |

Règles d'écriture : vouvoiement, phrases courtes, pas de tiret cadratin, pas de point d'exclamation sauf « Bonjour ! », « Paiement reçu ! » et « Paiement reçu avec succès ! ».

## 11. Accessibilité, sécurité et définition de « terminé »

### 11.1 Accessibilité
- Tous les éléments interactifs sont des `<button>` ou `<a>`. Focus visible (`outline` 3 px `--c-primaire`, décalage 2 px).
- Ordre de tabulation logique ; la barre du bas est un `<nav aria-label="Navigation principale">`.
- Régions `aria-live` : montant, statut de paiement, toasts.
- Zoom du texte à 200 % sans perte de fonction ; pas de `user-scalable=no`.
- Vérifier au lecteur d'écran (TalkBack) le parcours E3 → E4 → E5.

### 11.2 Sécurité côté interface
- Le lien NWC et la clé de signature ne sont jamais affichés en clair sans action volontaire, jamais journalisés (`console.*` interdit en production pour ces valeurs), jamais envoyés au backend.
- Toutes les entrées sont validées (montants entiers > 0 et ≤ plafond, textes ≤ 120 caractères, liens NWC au bon format).
- Le statut « payé » ne vient que du portefeuille (préimage). Aucun état de succès optimiste.
- Le cours affiché indique toujours s'il est en direct ou en cache, avec l'heure.

### 11.3 Tests
- Tests e2e Playwright (projet `mobile-chromium` Pixel 7 + `chromium`), en mode démonstration :
  1. Bienvenue → mode démo → saisir 12 500 → QR → paiement reçu → la vente apparaît dans l'historique avec « Prouvé ».
  2. Vente déclarée « 2 sacs de riz, 15 000 » → confirmation → historique « Déclaré ».
  3. Générer un passeport → ouvrir le lien → « Signature valide » et totaux identiques.
  4. Lien de passeport modifié → « Signature invalide ».
  5. Navigation : balayage gauche/droite entre les 4 onglets, tap sur chaque onglet, bouton retour.
  6. Hors ligne (contexte Playwright `offline`) : l'application s'ouvre, l'historique s'affiche, le bouton QR est désactivé avec le bon message.
- Vérifier à chaque écran : `document.documentElement.scrollWidth <= window.innerWidth`.
- Lighthouse mobile : Performance ≥ 85, Accessibilité ≥ 95, PWA installable.

### 11.4 Checklist avant de rendre
- [ ] `npm run build` et `tsc` sans erreur ni avertissement, zéro `any`.
- [ ] Aucun `#hex`, `px` magique ou durée en dur hors des fichiers de styles de tokens et de `signature.css`.
- [ ] Aucun `fetch` hors de `lib/`.
- [ ] Chaque écran a ses 4 états : chargement, vide, erreur, succès.
- [ ] Clair et sombre vérifiés sur la page d'aperçu et sur chaque écran.
- [ ] Mouvement réduit : aucune boucle, tout reste utilisable.
- [ ] Les 3 animations signature sont comparées image par image aux planches de `assets/references/`.
- [ ] À 390 × 844 et à 360 × 740, l'Accueil tient sans défilement.
- [ ] Aucun texte du commerçant ne contient « invoice », « NWC », « hash » ou « relay ».
- [ ] Aucun tiret cadratin dans les textes visibles.
