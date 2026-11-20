# Texte de la page Devpost

Texte à copier dans la page de soumission Devpost, section par section. Les crochets `[…]` sont à remplacer avant de publier.

---

## Nom du projet

**Caisse Lightning : le passeport de revenus des petits commerçants**

## Accroche (une ligne)

Une caisse Lightning qui transforme les ventes d'un commerçant de Dakar en passeport de revenus signé, que l'agent de microfinance vérifie lui-même.

## Liens

- Vidéo de démo : [lien YouTube]
- Application en ligne : [lien Render], passeport de démonstration : [lien Render]/#/preteur/p/demo000000
- Code source : https://github.com/darel07/DAKAR-CRYPTO-HACKATHON

---

## Inspiration

Au Sénégal, seuls **20,3 % des adultes ont accès à la microfinance**. Les autres empruntent parfois à **plus de 30 % par mois** auprès de prêteurs informels. Un vendeur de marché gagne sa vie, mais il ne peut pas le prouver : pas de relevé, pas d'historique, pas de crédit.

Nous voulions d'abord construire une caisse Lightning. L'étude de marché nous a fait changer d'avis : les caisses Lightning existent déjà (une huitaine de projets marchands dans cette seule galerie), et Wave est déjà gratuit pour le marchand jusqu'à 20 000 FCFA par jour. Le vrai manque n'est pas le paiement, c'est **la preuve des revenus**.

## Ce que fait le projet

Une application web installable (PWA), pensée pour un téléphone d'entrée de gamme et une connexion irrégulière :

1. **Encaisser en Lightning.** Le commerçant tape un montant en FCFA ; l'application crée une vraie facture Lightning au cours du moment, via **Nostr Wallet Connect** vers le wallet du commerçant (Alby Hub, LNbits). Le commerçant garde ses fonds ; la caisse ne peut que créer des factures, et l'application avertit si une connexion permet de dépenser.
2. **Ventes prouvées.** Un paiement n'est affiché comme reçu que lorsque le wallet le confirme. La préimage est enregistrée : c'est la preuve cryptographique du paiement.
3. **Ventes en espèces ou Wave.** Le commerçant écrit la vente comme il parle (« quinze mille pour 2 sacs de riz, wave ») ; l'IA propose l'article, le montant et le moyen ; il confirme toujours. Ces ventes sont marquées « Déclaré » : elles comptent, mais moins qu'une vente prouvée.
4. **Le client confirme son achat.** Le commerçant lui montre un QR ; le client signe depuis son téléphone, sans rien installer. Cette contresignature rend plus coûteux d'inventer des ventes.
5. **Le passeport de revenus.** En un geste, le commerçant signe son relevé avec sa clé Nostr (sauvegardée en 12 mots) et obtient un QR code à montrer à l'agent de microfinance.
6. **La vue prêteur.** L'agent ouvre le lien, sans compte ni application. Tout est revérifié dans son navigateur : la signature du relevé, chaque paiement (préimage contre facture), chaque confirmation de client, et **le montant de chaque vente prouvée, comparé au cours du bitcoin le jour de la vente**. Il obtient un plafond de prêt **indicatif** (20 % du flux mensuel, règle inspirée d'une banque de microfinance nigériane) et une liste honnête de ce qui n'est pas vérifiable.

## Comment nous l'avons construit

- **Front** : React 19, TypeScript strict, Vite, CSS natif avec design system en jetons, PWA (service worker, hors connexion), version mobile et ordinateur. Lightning par `@getalby/sdk` (NWC), signature par `nostr-tools`, vérification des factures par `light-bolt11-decoder`.
- **API** (facultative : sans elle, l'application fonctionne en mode dégradé) : Fastify 5, zod, SQLite. Cours FCFA/BTC (CoinGecko puis mempool.space, avec cache), historique des cours pour la vue prêteur, liens courts pour les passeports et les reçus (signature vérifiée avant tout stockage), analyse et résumé par IA.
- **IA** : Claude, ou tout fournisseur compatible OpenAI, y compris un **modèle local** (Ollama) pour qu'aucune donnée de vente ne quitte le serveur. Mesuré : 8 phrases sur 9 justes en 2 à 3 s sur processeur.
- **Installation en une commande** : `docker compose up`, avec un passeport de démonstration prêt à vérifier.

## Sécurité dès la conception

- Le serveur ne voit **jamais** le lien du wallet, la clé de signature ni une facture en cours. Compromis, il ne peut ni dépenser, ni signer, ni modifier un passeport sans casser sa signature.
- Un modèle de menace en 12 points est dans le README : auto-paiement, montant gonflé, passeport falsifié, faux clients, vol du téléphone, injection de script, abus de l'API, injection dans l'IA…
- **Une faille trouvée et corrigée pendant le hackathon** : la preuve Lightning dit qu'une facture a été payée, pas combien de FCFA elle valait. Un commerçant pouvait encaisser 1 sat et déclarer 100 000 FCFA « prouvés ». Le cours ne pouvant pas venir du passeport (le commerçant le signe), la vue prêteur compare désormais chaque vente au cours public du jour.
- Garde-fous contre l'IA : aucun montant si la phrase ne contient aucun nombre (nous avons mesuré un modèle qui répondait 15 000 FCFA à « bonjour »), libellé obligatoirement tiré de la phrase, confirmation toujours exigée.
- CSP stricte, limites de débit, aucune donnée personnelle dans les journaux, scan de secrets sur tout l'historique.

## Difficultés rencontrées

- **Rendre une preuve infalsifiable par celui qui la produit.** Le commerçant signe son propre passeport : tout ce qu'il y écrit peut mentir. Il a fallu que chaque contrôle s'appuie sur une donnée qu'il ne contrôle pas (préimage, signature du client, cours public).
- **L'auto-paiement** reste possible : un commerçant peut se payer lui-même. Nous ne le cachons pas ; l'écran du prêteur le dit, et la contresignature des clients le rend plus coûteux.
- **Un petit modèle d'IA local** était rapide mais inventait des montants. Des exemples dans la consigne et des garde-fous côté serveur l'ont rendu utilisable.
- **Pas de vrai wallet dans l'équipe** : nous avons testé de vrais paiements Lightning avec le faucet NWC d'Alby, sans jamais simuler une preuve.

## Ce dont nous sommes fiers

- Un parcours complet et réel, de l'encaissement à la vérification par le prêteur, sans maquette.
- **117 tests côté API, 13 côté front, 18 parcours navigateur** (mobile et ordinateur) joués à chaque modification contre l'image Docker, plus un audit d'accessibilité automatique.
- Lighthouse mobile : **performance 91, accessibilité 100**.
- Une application qui reste utile le jour où le commerçant n'a reçu aucun sat, grâce aux ventes déclarées.

## Ce que nous avons appris

Bitcoin et Nostr servent ici moins à payer qu'à **rendre une donnée vérifiable** par quelqu'un qui ne fait confiance à personne. Et l'honnêteté de l'interface (« prouvé » contre « déclaré », plafond « indicatif ») compte autant que la cryptographie.

## La suite

- Un pilote avec une institution de microfinance sénégalaise (Pamecas, CMS, ACEP) : aucune n'a encore validé le principe, c'est la prochaine étape.
- Le règlement en FCFA via un partenaire agréé (loi 2024-08), sans le simuler d'ici là.
- Des connexions plafonnées et révocables pour les vendeurs d'une boutique.
- La saisie vocale en wolof.

## Construit avec

`bitcoin` `lightning` `nostr` `nwc` `react` `typescript` `vite` `pwa` `fastify` `sqlite` `zod` `docker` `ollama` `claude` `playwright`

## Équipe

- **Darel** : wallet et backend (NWC, factures, confirmation de paiement), docs et pitch
- **Yanis** et **Raoul** : front et UX (interface PWA, QR code, historique, passeport)
- **Jean-Victor** : IA et Nostr (saisie en langage naturel, signature, contresignature, vérification)
- **Shalom** : docs et pitch (README, schéma, vidéo, soumission Devpost)

---

## English version (for the international jury)

**Caisse Lightning: an income passport for small merchants.** A Lightning point of sale that turns a Dakar merchant's sales into a signed income passport that a microfinance officer can verify on their own.

**Why.** Only 20.3% of adults in Senegal have access to microfinance; others sometimes borrow at more than 30% a month. Payments are not the problem (Wave is free for merchants up to 20,000 XOF a day). Proving income is. A market vendor earns a living but has no statement to show a lender.

**What it does.** The merchant charges in XOF and the app issues a real Lightning invoice through Nostr Wallet Connect to the merchant's own wallet (self-custody, invoice-only permissions, a warning if the connection can spend). A sale is "proven" only when the wallet returns the preimage. Cash and Wave sales are typed in plain words, structured by AI, always confirmed, and marked "declared". Customers can countersign their receipt from their own phone. The merchant signs a monthly statement with their Nostr key and shows a QR code. The lender's page, with no account and no app, re-verifies everything in the browser: the signature, each payment's preimage, each customer countersignature, and each proven amount against that day's public bitcoin price. It shows an indicative credit limit (20% of monthly flow) and states plainly what cannot be verified.

**Security by design.** The server never sees the wallet connection, the signing key or a pending invoice. A 12-point threat model is in the README. A real flaw found during the hackathon (1 sat declared as 100,000 XOF "proven") is fixed by checking amounts against a price the merchant cannot control. AI guardrails stop invented amounts. Strict CSP, rate limits, no personal data in logs, secret scanning on the whole history.

**Built with.** React 19, TypeScript, Vite, PWA, @getalby/sdk (NWC), nostr-tools, Fastify, SQLite, zod, Docker, Claude or any OpenAI-compatible model including a local Ollama model (8/9 correct, 2 to 3 s on CPU). 117 API tests, 13 front tests, 18 browser journeys on every change; Lighthouse mobile: performance 91, accessibility 100. One command: `docker compose up`.

**What's next.** A pilot with a Senegalese microfinance institution, XOF settlement through a licensed partner, capped and revocable connections for shop staff, and voice input in Wolof.

**Team.** Darel: wallet and backend, docs and pitch. Yanis and Raoul: front end and UX. Jean-Victor: AI and Nostr. Shalom: docs and pitch.
