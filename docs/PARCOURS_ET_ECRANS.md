# Parcours et écrans

Document de référence pour le design et le développement du front. Nom de travail du produit : **Passeport de revenus**.

## 1. Acteurs

| Acteur | Qui | Ce qu'il veut | Ce qu'il utilise |
|---|---|---|---|
| **Commerçant** | Vendeur de marché ou de boutique de quartier à Dakar, smartphone d'entrée ou moyenne gamme, connexion irrégulière | Encaisser, garder une trace de ses ventes, prouver ses revenus pour obtenir un crédit | L'application complète (PWA) |
| **Client payeur** | Passant, habitué, touriste ou membre de la diaspora | Payer vite, avoir un reçu | Son propre wallet Lightning. Reçoit un reçu Nostr et peut le contresigner |
| **Vendeur / employé** | Aide ou apprenti du commerçant | Encaisser et rendre la monnaie sans accéder à tout le compte | Un lien de caisse et une connexion NWC à budget plafonné |
| **Agent de microfinance (prêteur)** | Agent de terrain ou analyste crédit d'une IMF | Vérifier en une minute qu'un relevé de revenus est authentique | La page « vue prêteur », sans compte, en scannant un QR |

### Systèmes
| Système | Rôle |
|---|---|
| **Wallet (Alby Hub / LNbits)** | Détient les fonds, crée les factures, notifie les paiements, via NWC |
| **Relais Nostr** | Publie et distribue le passeport et les reçus |
| **Service de taux de change** | Convertit FCFA en sats (repli sur le dernier taux en cache) |
| **IA (Claude)** | Transforme une phrase en vente structurée, résume la journée |

## 2. Principes d'interface

- **Une action par écran.** Le commerçant est en plein marché : un seul gros bouton, des phrases courtes, pas de jargon (« sats », « NWC » et « hash » n'apparaissent jamais sur les écrans du commerçant).
- **Prouvé / déclaré toujours visible.** Une pastille distingue chaque vente : « Prouvé » (paiement Lightning vérifié) ou « Déclaré » (saisi par le commerçant).
- **Utilisable hors connexion** pour la saisie et l'historique. Les actions qui exigent le réseau affichent un état clair, jamais un blocage silencieux.
- **Léger** : peu d'images, pas de bibliothèque lourde, texte lisible en plein soleil (contraste élevé), cibles tactiles d'au moins 48 px.
- **Langue** : français simple. Wolof en piste d'évolution.
- **Montants** : toujours en FCFA pour le commerçant ; l'équivalent en sats est secondaire.

## 3. Parcours

### P1. Première utilisation du commerçant (une fois)
1. Ouvre le lien, installe l'application sur l'écran d'accueil.
2. **Connecte son wallet** en collant ou scannant le lien de connexion. L'écran explique en une phrase que l'application peut seulement créer des factures, jamais dépenser.
3. L'application crée sa clé de signature en local et propose de la sauvegarder (phrase de secours).
4. Arrive sur la caisse.

### P2. Encaisser un paiement Lightning (parcours principal, prouvé)
1. Sur la **caisse**, tape le montant en FCFA.
2. Appuie sur « Encaisser ». L'application affiche le **QR de paiement** avec le montant et un compte à rebours.
3. Le client scanne et paie avec son wallet.
4. L'écran passe en vert : « Paiement reçu » (son, vibration). La vente est enregistrée comme **Prouvée**.
5. Proposition : « Envoyer le reçu au client » (reçu Nostr, que le client peut contresigner).

### P3. Enregistrer une vente en espèces ou Wave (déclarée)
1. Sur la caisse, appuie sur « Vente en espèces / Wave ».
2. Tape ou dicte une phrase : « 2 sacs de riz, 15 000 ».
3. L'IA propose une ligne structurée (article, quantité, montant). Le commerçant **confirme ou corrige** (confirmation toujours obligatoire).
4. La vente est enregistrée comme **Déclarée**.

### P4. Consulter ses ventes et le résumé du jour
1. Ouvre l'**historique** : liste par jour, avec total prouvé et total déclaré.
2. Ouvre le **résumé du jour** : phrase simple générée par l'IA (« Aujourd'hui : 14 ventes, 87 500 FCFA, dont 32 000 prouvées »).
3. Peut exporter ses ventes.

### P5. Générer et partager son passeport de revenus
1. Ouvre « Mon passeport ».
2. Choisit la période (30 jours par défaut). Voit la part prouvée et la part déclarée.
3. Appuie sur « Générer mon passeport ». L'application signe le relevé avec sa clé.
4. Obtient un **QR code** et un lien à montrer ou envoyer à l'agent de microfinance.

### P6. Vérification par l'agent de microfinance
1. Scanne le QR du commerçant avec son téléphone (aucun compte requis).
2. La **page « vue prêteur »** s'ouvre : signature valide ou non, période, total prouvé recalculé à partir des paiements, total déclaré, part de ventes contresignées par des clients.
3. Voit un **plafond de prêt indicatif** (20 % du flux mensuel) et un avertissement clair : indicatif, non contraignant.
4. Décide hors de l'application.

### P7. Contresignature par le client (optionnel)
1. Le client reçoit son reçu Nostr après un paiement.
2. Appuie sur « Confirmer cet achat ». Sa signature est ajoutée au reçu.
3. Le passeport du commerçant compte ce paiement comme **contresigné**, ce qui renforce la preuve.

### P8. Équipe : donner un accès limité à un vendeur
1. Le commerçant ouvre « Mon équipe », appuie sur « Ajouter un vendeur ».
2. Choisit un nom et un plafond journalier, puis partage le lien ou le QR de connexion.
3. Le vendeur ouvre le lien : il voit une caisse simplifiée et son budget restant, sans accès au solde ni au passeport.
4. Le commerçant peut **révoquer** l'accès à tout moment.

## 4. Écrans

Légende : **C** = commerçant, **V** = vendeur, **P** = client payeur, **A** = agent de microfinance.

| ID | Écran | Acteur | Contenu principal | Actions | États à prévoir |
|---|---|---|---|---|---|
| **C0** | Bienvenue | C | Promesse en une phrase, bouton « Commencer » | Commencer | Hors ligne |
| **C1** | Connexion du wallet | C | Champ ou scan du lien de connexion, phrase de réassurance (« L'application ne peut pas dépenser votre argent ») | Coller / scanner, Tester | Lien invalide, wallet injoignable, succès |
| **C2** | Sauvegarde de la clé | C | Phrase de secours, case de confirmation | Copier, J'ai sauvegardé | Refus de continuer sans confirmation |
| **C3** | **Caisse** (écran principal) | C | Pavé numérique en FCFA, équivalent en sats en secondaire, indicateur de connexion | Encaisser, Vente espèces/Wave | Montant nul ou trop grand, hors ligne, taux en cache |
| **C4** | QR de paiement | C | QR, montant, compte à rebours, statut | Annuler, Partager la facture | En attente, expirée, erreur de réseau |
| **C5** | Paiement reçu | C | Grand message vert, montant, pastille « Prouvé », son et vibration | Nouveau paiement, Envoyer le reçu | Succès, reçu déjà envoyé |
| **C6** | Vente déclarée | C | Champ texte ou micro, ligne structurée proposée par l'IA, pastille « Déclaré » | Confirmer, Corriger, Annuler | IA indisponible (saisie manuelle), montant ambigu |
| **C7** | Historique | C | Liste par jour, totaux prouvé et déclaré, filtre | Ouvrir une vente, Exporter | Liste vide (avec données d'exemple), très longue liste |
| **C8** | Détail d'une vente | C | Montant, heure, type, statut de preuve, contresignature client | Renvoyer le reçu | Prouvée, déclarée, contresignée |
| **C9** | Résumé du jour | C | Phrase générée, chiffres clés | Partager | IA indisponible (résumé chiffré simple) |
| **C10** | **Mon passeport** | C | Période, part prouvée et déclarée, nombre de ventes contresignées | Générer, Partager | Pas assez de ventes, génération en cours |
| **C11** | Passeport partagé | C | QR, lien, date de validité | Copier le lien, Envoyer | Hors ligne (QR toujours disponible) |
| **C12** | Mon équipe | C | Liste des vendeurs, budget utilisé | Ajouter, Révoquer | Aucun vendeur, accès révoqué |
| **C13** | Ajouter un vendeur | C | Nom, plafond journalier, QR de connexion | Créer | Plafond invalide |
| **C14** | Paramètres et sécurité | C | Langue, taux de change, sauvegarde de la clé, déconnecter le wallet | Changer, Déconnecter | |
| **V1** | Caisse vendeur | V | Pavé numérique, budget restant du jour | Encaisser | Budget épuisé, accès révoqué |
| **P1** | Reçu | P | Montant, commerçant, date, preuve de paiement | Confirmer cet achat | Déjà confirmé |
| **A1** | **Vue prêteur** | A | Statut de la signature, période, total prouvé, total déclaré, part contresignée, plafond indicatif, avertissement | Vérifier un autre passeport | Signature invalide, passeport expiré, lien illisible |

### Écrans clés pour la démo de 3 minutes
C3 (caisse) → C4 (QR) → C5 (paiement reçu, vrai paiement) → C6 (vente déclarée) → C10 (passeport) → A1 (vue prêteur).

## 5. Navigation

```
Commerçant :  [Caisse]  [Historique]  [Passeport]  [Équipe]      (barre du bas, 4 entrées)
                 │           │             │
                 ├─ QR ─ Reçu    └─ Détail     └─ Partage
                 └─ Vente déclarée

Vendeur    :  [Caisse vendeur]
Client     :  Reçu (page unique, via lien)
Prêteur    :  Vue prêteur (page unique, via QR)
```

## 6. Ce qui ne doit jamais apparaître à l'écran
- Clé privée, lien de connexion du wallet, préimage.
- Jargon technique dans les écrans du commerçant : « NWC », « hash », « relay », « invoice ».
- Un plafond de prêt présenté comme une promesse. Il est toujours « indicatif ».
