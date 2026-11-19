# Passeport de revenus : la caisse qui ouvre l'accès au microcrédit

Projet pour le **Dakar Bitcoin Hack 2026** (Btrust) : https://dakar-bitcoin-hack-2026.devpost.com/

> Nom de travail. Le produit était d'abord pensé comme une « caisse Lightning ». L'étude de marché (voir `docs/ETUDE_MARCHE.md`) a montré que ce positionnement est déjà très occupé. Le projet vend désormais une **preuve de revenus vérifiable**, la caisse Lightning n'étant que la source des données.

## 1. Récap du hackathon

| Élément | Détail |
|---|---|
| Thème | Outils pour améliorer la vie des Africains, autour de Bitcoin, Lightning, Nostr et IA |
| Format | 100 % en ligne, public, open-source |
| Deadline | **20 nov 2026, 21h (GMT+1)** |
| Prix | 500 $ / 250 $ / 150 $ en BTC (le règlement indique 500k / 250k / 100k sats : à confirmer) |
| Rendu obligatoire | Présentation (texte ou vidéo) + prototype/MVP/PoC + **au minimum une implémentation de wallet Bitcoin/Lightning** |

### Critères du jury
1. **Utilité et impact local** : problème réel, utilisateur précis, portée estimée.
2. **Sécurité by design** : modèle de menace, moindres privilèges, secrets protégés, entrées validées, pas de données personnelles dans les logs.
3. **UX/UI** : fluide sur faible débit et téléphone moyen de gamme, textes simples.
4. **MVP fonctionnel** : démo de bout en bout, installation en une commande, données d'exemple, pas de maquette.
5. **Pitch et docs** : démo de 3 min (problème, solution, impact, suite), README avec schéma d'architecture.
6. **Originalité** (citée dans le règlement).

## 2. Le projet

**Problème** : au Sénégal, le crédit manque pour les petits commerçants, pas les moyens de paiement. Seuls 20,3 % des adultes ont accès à la microfinance, et les prêteurs informels prennent parfois plus de 30 % par mois. Faute de relevé de revenus, un vendeur de marché ne peut rien prouver à un prêteur. Les paiements, eux, sont déjà peu coûteux (Wave est gratuit pour le marchand jusqu'à 20 000 FCFA par jour, puis 1 %).

**Solution** : une application web légère (PWA) qui tient le journal des ventes du commerçant et le transforme en **passeport de revenus signé**, vérifiable par un prêteur en scannant un QR code.
- Les ventes encaissées en **Lightning** sont **prouvées** (hash de paiement et préimage).
- Les ventes en espèces ou Wave sont **déclarées**, saisies en langage naturel avec l'IA (« 2 sacs de riz, 15 000 »).
- Le relevé est signé avec la clé Nostr du commerçant. Une page « vue prêteur » vérifie la signature, recalcule le total prouvé et affiche un plafond de prêt indicatif (20 % du flux mensuel, règle inspirée d'une banque de microfinance nigériane).
- Le client peut **contresigner son reçu** (Nostr), ce qui rend plus coûteux de fabriquer de fausses ventes.
- Le commerçant peut donner à ses **vendeurs une connexion NWC à budget plafonné et révocable**.

**Utilisateur cible** : un vendeur de marché ou un petit commerçant de Dakar, avec un smartphone d'entrée ou de moyenne gamme et une connexion irrégulière.

**Acteurs** : commerçant, client payeur, vendeur/employé, agent de microfinance (vérificateur). Voir `docs/PARCOURS_ET_ECRANS.md`.

**Ce que le projet ne promet pas** : un prêt réel. Aucune institution de microfinance n'a validé le principe. C'est un pilote à proposer à une IMF, et le pitch doit le dire.

**Indicateurs à suivre** : nombre de marchands actifs par semaine, nombre de passeports générés, part de ventes prouvées, nombre de vérifications côté prêteur, temps jusqu'à la confirmation d'un paiement.

## 3. Pourquoi ce choix (résumé de l'étude)

- La caisse Lightning de base existe déjà en open source (Alby BuzzPay, Blink Terminal).
- Environ 8 des 49 projets Devpost de ce hackathon sont des outils marchands (dont Jaay et SunuSats). Aucun ne revendique le relevé de revenus vérifiable.
- Très peu de commerçants acceptent le bitcoin au Sénégal (8 lieux sur BTC Map), et même au Salvador, où c'était obligatoire, seulement 4,9 % des ventes se faisaient en bitcoin. Le produit doit donc rester utile le jour où le commerçant n'a reçu aucun sat, d'où les ventes déclarées.
- Risque principal : la fraude par auto-paiement. Elle est traitée dans le modèle de menace (niveaux de preuve, contresignature client, plafond prudent).

Détails et sources : `docs/ETUDE_MARCHE.md`.

## 4. Features

### MVP (à livrer impérativement)
- [ ] **Connexion wallet via NWC** (Nostr Wallet Connect) vers Alby Hub, LNbits ou un nœud de test. C'est l'implémentation de wallet exigée.
- [ ] **Saisie du montant en FCFA** avec conversion en sats (taux de change, repli en cache hors ligne).
- [ ] **Facture Lightning** en QR code et **confirmation de paiement en temps réel**, avec un vrai paiement de quelques sats en démo.
- [ ] **Ventes déclarées** (espèces ou Wave) saisies en texte, avec analyse par l'IA en langage naturel.
- [ ] **Historique des ventes** (stockage local), avec la distinction **prouvé / déclaré**.
- [ ] **Passeport de revenus** : événement Nostr signé (totaux journaliers, séparation prouvé/déclaré, hash des paiements Lightning).
- [ ] **Page « vue prêteur »** : vérification de la signature, total prouvé recalculé, plafond de prêt indicatif.
- [ ] **Interface mobile** : un écran principal, gros boutons, textes sans jargon, français.
- [ ] **Installation en une commande** (`docker compose up`) avec données d'exemple.

### Sécurité (attendu par le jury)
- [ ] Secret NWC et clé de signature stockés localement, jamais envoyés à un serveur tiers.
- [ ] Connexion NWC de la caisse limitée à la création et à la consultation de factures, sans droit de paiement.
- [ ] Connexions NWC des vendeurs avec plafond de budget, expiration et révocation.
- [ ] Validation de toutes les entrées (montants, texte libre).
- [ ] Aucune donnée personnelle dans les logs.
- [ ] Section « modèle de menace » dans ce README (fraude au relevé, vol de clé, fausse contresignature).

### Bonus (si le temps le permet)
- [ ] **Contresignature du reçu par le client** (Nostr, message chiffré).
- [ ] **Résumé de la journée** en français simple (IA).
- [ ] Budgets NWC par vendeur (écran patron/vendeur).
- [ ] Mode PWA installable, utilisable avec une connexion faible.
- [ ] Saisie vocale en wolof (piste de la prochaine itération).

### Prochaine itération (à citer dans le pitch, sans la simuler)
- Règlement en FCFA via un partenaire comme Banxaas, soumis à l'agrément PSAV (loi 2024-08).
- Pilote avec une institution de microfinance (Pamecas, CMS, ACEP).
- Caisse vocale en wolof.

## 4 bis. Lancer l'application (état au 18 nov)

```bash
cd app
npm install
npm run dev        # http://localhost:5173, ouvrable sur le téléphone via l'adresse réseau affichée
npm run build      # build de production
```

Dans les **Réglages**, collez le lien de connexion NWC d'Alby Hub ou LNbits, ou choisissez le **mode démonstration** (paiement simulé, signalé à l'écran, à ne pas utiliser pour la démo finale).

| Fonction | État |
|---|---|
| Design system (tokens, primitives, page `#/apercu-design-system`) | fait |
| Caisse : montant FCFA, conversion en sats avec cache, facture NWC, QR, confirmation | fait (à tester avec un vrai wallet) |
| Vente déclarée avec analyse locale du texte et confirmation obligatoire | fait (analyse par règle ; appel à Claude à brancher côté serveur) |
| Historique prouvé / déclaré, export | fait |
| Passeport signé (Nostr), lien et QR | fait |
| Vue prêteur : signature, préimages, plafond indicatif | fait (testé sur signature et falsification) |
| Contresignature client, budgets vendeurs (écrans C12, C13, P1) | à faire |
| Backend : cours en cache, analyse et résumé par Claude, liens courts, `docker compose up` | fait côté serveur (branche `back`) ; à brancher dans le front |
| Wolof | à faire |

## 4 ter. Backend

Une petite API **sans compte et sans secret utilisateur** (dossier `backend/`, Fastify 5 et TypeScript). Le backend ne voit jamais le lien de connexion du portefeuille, la clé de signature ni une facture : le paiement se passe entre le téléphone et le portefeuille. S'il est éteint, le front continue de marcher.

### Installation en une commande

```bash
docker compose up        # puis http://localhost:8080
```

Sans aucune variable : application, passeport de démonstration (`http://localhost:8080/#/preteur/p/demo000000`), analyse et résumé par règles locales. Pour activer Claude : `ANTHROPIC_API_KEY=... docker compose up`.

Développement du back seul :

```bash
cd backend
npm install
cp .env.example .env     # DATABASE_PATH=./caisse.sqlite pour travailler en local
npm run dev              # http://localhost:8080, documentation sur /api/docs
npm test                 # tests unitaires, d'abus et de contrat
```

### Routes

| Route | Rôle | Limite |
|---|---|---|
| `GET /api/sante` | État du service (lit la mémoire, aucun appel externe) | 120/min |
| `GET /api/taux` | Cours FCFA pour 1 BTC : CoinGecko puis mempool.space, cache 60 s, dernier cours en base | 120/min |
| `POST /api/ia/analyser` | Phrase du commerçant vers vente structurée (proposition, confirmation exigée) | 20/min, partagée avec le résumé |
| `POST /api/ia/resume` | Résumé du jour à partir de chiffres agrégés | idem |
| `POST /api/passeports` | Lien court pour un passeport signé, vérifié avant stockage, 30 jours | 10/h |
| `GET /api/passeports/:id` | Charge d'un passeport raccourci | 60/min |

Documentation OpenAPI : `/api/docs` (interface) et `/api/openapi.json`. Erreurs : toujours `{ "error": { "code", "message" } }`, codes `VALIDATION_ERROR`, `NOT_FOUND`, `PAYLOAD_TOO_LARGE`, `RATE_LIMITED`, `SERVICE_UNAVAILABLE`, `INTERNAL_ERROR`.

### Variables d'environnement

Toutes facultatives ; voir `backend/.env.example`. Les principales : `ANTHROPIC_API_KEY` (absente : règles locales), `IA_MODELE` (`claude-opus-5-5`), `PUBLIC_URL`, `CORS_ORIGINS` (jamais `*`), `DATABASE_PATH`, `TRUST_PROXY`, `SEED_DEMO`. Une valeur invalide empêche le démarrage, avec un message qui donne les valeurs admises.

### Mode dégradé

| Panne | Comportement |
|---|---|
| Claude absent, en erreur, trop lent (8 s) ou qui refuse | Règle locale, réponse 200 avec `"source": "regle"` ; jamais de 5xx |
| Résumé de Claude qui cite un chiffre absent des entrées | Résumé par gabarit (`"source": "modele"`) |
| CoinGecko en panne | mempool.space |
| Tous les fournisseurs de cours en panne | Dernier cours connu (`"enCache": true`) ; 503 seulement si aucun cours n'a jamais été obtenu |
| Backend éteint | Le front appelle CoinGecko directement, analyse par règle, lien de passeport long |

### Sécurité

- Validation stricte de chaque entrée (zod), corps limité à 72 Kio, passeport à 64 Kio, décompression plafonnée (pas de « bombe » deflate).
- Un passeport n'est stocké que si sa signature Nostr est valide : le service ne peut pas servir d'hébergement gratuit. Il ne recalcule rien ; la vue prêteur re-vérifie tout.
- Journaux sans texte de vente, sans charge de passeport, sans clé d'API, avec IP tronquée au /24 ; erreurs internes renvoyées sans détail.
- CSP stricte, `Referrer-Policy: no-referrer` (le lien du passeport ne fuit pas), CORS sur liste explicite, conteneur non root en lecture seule sauf `/data`.
- CI : prettier, eslint sans avertissement, tsc, tests, `docker compose up --wait`, gitleaks sur tout l'historique.

### Limites connues

- Un seul réplica : les compteurs de débit, le cache des cours et le nettoyage horaire des passeports expirés vivent dans le processus.
- SQLite dans un volume : suffisant pour la démo et un pilote, pas pour plusieurs serveurs.
- L'appel réel à Claude n'a pas encore été testé avec une clé ; les replis le sont.

## 5. Livrables de soumission Devpost
- [ ] Description du projet (texte ou vidéo).
- [ ] Dépôt public avec le code et ce **README** (installation, schéma d'architecture, contraintes, indicateurs, prochaine itération).
- [ ] **Vidéo de démo de 3 minutes** : ouvrir sur le chiffre « 20,3 % d'accès à la microfinance contre plus de 30 % par mois chez les prêteurs informels », puis problème, solution, impact, suite.
- [ ] Soumission faite avant le **20 nov, 21h (GMT+1)**, avec une marge de sécurité.

## 6. Planning

| Date | Objectif |
|---|---|
| 18 nov | Squelette du projet, caisse NWC avec vrai paiement et QR, design system et écrans principaux |
| 19 nov | Saisie IA des ventes déclarées, événement passeport signé, page « vue prêteur », historique |
| 20 nov, jusqu'à 15h | Tests, modèle de menace, README, schéma d'architecture, vidéo de démo |
| 20 nov, 15h à 21h | Soumission Devpost |

## 7. Stack proposée
- **Front** : TypeScript, Vite ou Next.js, PWA.
- **Lightning** : `@getalby/sdk` (NWC), Alby Hub ou LNbits pour la démo.
- **Signature et partage** : `nostr-tools` (événement passeport, reçus et contresignatures).
- **IA** : API Claude pour l'analyse des ventes déclarées en langage naturel et le résumé.
- **Déploiement** : Docker Compose ; front sur Vercel, backend éventuel sur Railway ou Render.

## 8. Documentation
- [`docs/PARCOURS_ET_ECRANS.md`](docs/PARCOURS_ET_ECRANS.md) : acteurs, parcours et écrans.
- [`docs/ECRANS_APP.md`](docs/ECRANS_APP.md) : écrans réels de l'application, décision PWA, issues proposées.
- [`docs/ETUDE_MARCHE.md`](docs/ETUDE_MARCHE.md) : synthèse de l'étude de marché et de concurrence.

## 9. Répartition de l'équipe
À compléter une fois les compétences de chacun connues.

| Rôle | Personne | Tâches |
|---|---|---|
| Wallet / backend | ? | NWC, factures, confirmation de paiement |
| Front / UX | ? | Interface PWA, QR code, historique, passeport |
| IA / Nostr | ? | Saisie en langage naturel, signature, contresignature, vérification |
| Docs / pitch | ? | README, schéma, vidéo, soumission Devpost |
