# Script de la vidéo de démo (3 minutes)

Pour l'équipe qui tourne et monte la vidéo de soumission Devpost (issue #31). Durée cible : **2 min 50**, pour garder une marge sous les 3 minutes. Tout ce qui est montré est réel : aucun écran truqué, aucun montant inventé au montage.

## 1. Règles

1. **Rien de simulé présenté comme réel.** Le paiement Lightning est un vrai paiement, fait avec un wallet de test (faucet NWC d'Alby, sats sans valeur). On le dit à l'écran une fois (sous-titre du plan 6).
2. **Pas de mode démonstration** dans la vidéo : il affiche « Démo » et la vue prêteur rejette ces paiements. On connecte le wallet de test.
3. **Jamais « vous obtiendrez un prêt ».** Le plafond est « indicatif » ; aucune institution de microfinance n'a encore validé le projet (on le dit dans « la suite »).
4. **Chiffres sourcés seulement** (README et `docs/ETUDE_MARCHE.md`) : 20,3 % d'accès à la microfinance, plus de 30 % par mois chez les prêteurs informels.

## 2. Matériel et préparation (30 minutes, la veille du tournage)

| Quoi | Comment |
|---|---|
| Application | `docker compose up` à la racine, puis Chrome sur `http://localhost:8080` |
| Écran du commerçant | Chrome, outils de développement, mode appareil **390 × 844** (iPhone 12 Pro), zoom 100 %. Plus net qu'un téléphone filmé, et sans reflet |
| Écran du client | Une **deuxième fenêtre Chrome en navigation privée**, même mode appareil (c'est « le téléphone du client ») |
| Enregistrement | OBS Studio : une scène par fenêtre, 1920 × 1080, 30 images/s, micro séparé |
| Wallet de test | Dans un terminal : `curl -X POST "https://faucet.nwc.dev?balance=1000"`. Copier le lien `nostr+walletconnect://…` dans un fichier texte (ne pas le montrer en gros plan) |
| Repartir de zéro | Fenêtre du commerçant en **navigation privée** neuve juste avant la prise : aucune vente, aucune clé |
| IA (facultatif) | Avec une clé Groq ou Gemini gratuite (voir `backend/.env.example`), relancer `docker compose up` avec les variables `IA_…` : l'écran « Vente en espèces ou Wave » n'affiche plus « Analyse hors ligne ». Sans clé, le plan 9 reste valable (on dit « analyse locale ») |

**Faire payer la facture pendant la prise** (le terminal reste hors champ) :

```bash
curl -X POST "https://faucet.nwc.dev/pay-invoice?invoice=COLLER_LA_FACTURE_ICI"
```

Le paiement arrive en 1 à 2 secondes. Faire une répétition complète avant la vraie prise.

## 3. Découpage plan par plan

Voix off : environ 400 mots en tout, débit calme. Les textes entre guillemets dans « À l'écran » sont ceux que l'application affiche réellement.

### Plan 1 · 0:00 → 0:12 · Accroche

| À l'écran | Voix off |
|---|---|
| Écran **Bienvenue** (rubans animés, pièce FCFA qui tourne). Titre incrusté en grand : **20,3 %** puis **30 % par mois** | « Au Sénégal, seuls 20,3 % des adultes ont accès à la microfinance. Les autres empruntent parfois à plus de 30 % par mois. » |

Montage : incrustations animées sur fond flouté de l'écran Bienvenue, une par phrase.

### Plan 2 · 0:12 → 0:25 · Le problème, la solution

| À l'écran | Voix off |
|---|---|
| Bienvenue net, « Votre téléphone devient votre caisse Lightning. » | « Le problème n'est pas de payer : c'est de prouver ce qu'on gagne. Un vendeur de marché n'a pas de relevé. Caisse Lightning encaisse ses ventes et en fait un passeport de revenus, que l'agent de microfinance vérifie lui-même. » |

Geste : à la fin, toucher **« Commencer »**.

### Plan 3 · 0:25 → 0:42 · Connexion du wallet, sécurité

| À l'écran | Voix off |
|---|---|
| **Connecter mon portefeuille**. Coller le lien dans « Lien de connexion », toucher « Connecter mon portefeuille ». L'alerte **« Cette connexion peut dépenser votre argent. »** apparaît | « Le commerçant relie son propre wallet par Nostr Wallet Connect. Il garde ses fonds. La caisse n'a besoin que de créer des factures : si la connexion permet de dépenser, l'application le signale. » |

Geste : toucher **« Continuer quand même »** (sous-titre : « Wallet de test : il autorise tout »).

### Plan 4 · 0:42 → 0:52 · Sauvegarde de la clé (accéléré ×2)

| À l'écran | Voix off |
|---|---|
| **Sauvegardez votre clé**, grille de 12 mots, cocher « J'ai noté mes 12 mots en lieu sûr. », « Continuer » | « Le passeport est signé par une clé qui reste sur le téléphone, sauvegardée en douze mots. » |

Montage : flouter la grille de mots (bonne pratique, même pour un wallet de test).

### Plan 5 · 0:52 → 1:05 · Encaisser

| À l'écran | Voix off |
|---|---|
| **Accueil** : taper `2`, `5`, `0`, `0`. Le montant affiche « 2 500 FCFA », « ≈ 6 800 sats », « Cours du … ». Toucher **« Créer un QR code »**, la caisse se transforme en ticket avec le QR | « Le commerçant tape un montant en francs CFA. L'application le convertit en sats au cours du moment et affiche une vraie facture Lightning. » |

### Plan 6 · 1:05 → 1:20 · Paiement reçu (le moment clé)

| À l'écran | Voix off |
|---|---|
| **Faire payer le client**, « En attente du paiement… », compte à rebours. Hors champ : « Copier la facture », lancer la commande `pay-invoice`. Le vert envahit l'écran : **« Paiement reçu ! »**, pièce FCFA, pastille **« Prouvé »** | « Le client paie avec son wallet. » (pause) « Le paiement est confirmé par le wallet du commerçant : la preuve cryptographique est enregistrée. Pas de confirmation avant le paiement réel. » |

Sous-titre obligatoire pendant le paiement : **« Paiement réel sur le réseau Lightning, depuis un wallet de test (faucet NWC Alby). »**

Montage : ne pas couper entre le QR et l'écran vert ; garder la transition d'un seul tenant (elle montre que c'est en direct).

### Plan 7 · 1:20 → 1:38 · Le client confirme l'achat

| À l'écran | Voix off |
|---|---|
| Toucher **« Envoyer un reçu au client »** : feuille « Reçu pour le client » avec QR. Couper sur la fenêtre du client (écran partagé côte à côte) : **« Reçu de paiement »**, « Paiement prouvé 2 500 FCFA », toucher **« Confirmer cet achat »**, « Merci ! Votre confirmation a été enregistrée. » | « Pour rendre les fausses ventes plus coûteuses, le client peut confirmer son achat depuis son téléphone, sans rien installer. Sa signature rejoint le passeport. » |

### Plan 8 · 1:38 → 1:52 · Vente en espèces ou Wave

| À l'écran | Voix off |
|---|---|
| Accueil, « Vente en espèces ou Wave ». Écrire **« 2 sacs de riz, 15 000 wave »**, « Analyser » : article, montant et moyen se remplissent. « Enregistrer 15 000 FCFA » | « La plupart des ventes restent en espèces ou sur Wave. Le commerçant les écrit comme il parle ; l'IA propose la vente, il confirme. Elle est marquée « Déclaré » : elle compte, mais moins qu'une vente prouvée. » |

Si l'IA n'est pas configurée, remplacer « l'IA propose la vente » par « l'application propose la vente ».

### Plan 9 · 1:52 → 2:10 · Le passeport

| À l'écran | Voix off |
|---|---|
| Onglet **Ventes** (une vente « Prouvé », une « Déclaré ») 2 s, puis onglet **Passeport** : « Mon activité », part prouvée, **Résumé du jour**. Toucher **« Générer mon passeport »** : feuille **« Passeport signé »** avec le QR, « Lien valable 30 jours » | « En un geste, le commerçant signe son relevé : ventes prouvées, ventes déclarées, confirmations de clients. Il obtient un QR code à montrer à l'agent de microfinance. » |

Geste : « Copier le lien », puis l'ouvrir dans la fenêtre du client (qui devient l'agent).

### Plan 10 · 2:10 → 2:38 · La vue prêteur

| À l'écran | Voix off |
|---|---|
| **Vérification d'un passeport de revenus** : « Signature valide », « 1 paiement vérifié », « Plafond de prêt indicatif ». Défiler lentement jusqu'à **« Ce qui a été vérifié »** : signature, préimage, « 1 paiement confirmé par 1 client », « Montant de chaque paiement comparé au cours du bitcoin le jour de la vente » | « L'agent n'a ni compte ni application. Tout est revérifié dans son navigateur : la signature, chaque paiement, la confirmation du client, et même le montant, comparé au cours du bitcoin le jour de la vente. Le plafond reste indicatif, et l'écran dit honnêtement ce qui n'est pas vérifiable. » |

Plan d'insert (5 s, facultatif) : coller dans l'adresse un lien de passeport dont un caractère a été modifié → **« Signature invalide »** ou « Passeport illisible ». Voix off : « Un seul caractère changé, et le passeport est rejeté. »

### Plan 11 · 2:38 → 2:50 · Impact et suite

| À l'écran | Voix off |
|---|---|
| Carton de fin : nom du projet, « Open source », `docker compose up`, lien du dépôt, logos Bitcoin · Lightning · Nostr | « Caisse Lightning est open source et s'installe en une commande. La suite : un pilote avec une institution de microfinance, le règlement en francs CFA via un partenaire agréé, et la saisie vocale en wolof. » |

## 4. Montage

- **Format** : 1920 × 1080. L'écran du téléphone au centre ; à droite, le titre du plan en grand (« Encaisser », « Le client confirme », « La vérification »).
- **Sous-titres** : français incrustés, et piste anglaise (jury international, Btrust).
- **Musique** : discrète, libre de droits, baissée pendant le plan 6 pour laisser respirer le moment du paiement.
- **Accélérations** : seulement le plan 4. Jamais sur le paiement (plan 6), pour qu'on voie que c'est en direct.
- **Interdit au montage** : retoucher un montant, un statut ou une pastille ; couper entre le QR et « Paiement reçu ».
- **Vérifier avant d'exporter** : durée ≤ 2:55 ; le sous-titre « wallet de test » est bien visible au plan 6 ; aucun lien `nostr+walletconnect://` ni mots de clé lisibles.

## 5. Liste de contrôle avant la prise

- [ ] `docker compose up` lancé depuis `main` à jour, `http://localhost:8080/api/sante` répond
- [ ] Wallet de test créé, lien copié dans un fichier hors champ
- [ ] Fenêtres commerçant et client en navigation privée neuve, mode appareil 390 × 844
- [ ] Terminal prêt avec la commande `pay-invoice`
- [ ] Une répétition complète faite, chronométrée
- [ ] Notifications de l'ordinateur coupées
