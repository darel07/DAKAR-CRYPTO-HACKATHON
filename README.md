# Caisse Lightning pour petits commerçants

Projet pour le **Dakar Bitcoin Hack 2026** (Btrust) : https://dakar-bitcoin-hack-2026.devpost.com/

## 1. Récap du hackathon

| Élément | Détail |
|---|---|
| Thème | Outils pour améliorer la vie des Africains, autour de Bitcoin, Lightning, Nostr et IA |
| Format | 100 % en ligne, public, open-source |
| Deadline | **20 nov 2026, 21h (GMT+1)** |
| Prix | 500 $ / 250 $ / 150 $ en BTC |
| Rendu obligatoire | Présentation (texte ou vidéo) + prototype/MVP/PoC + **au minimum une implémentation de wallet Bitcoin/Lightning** |

### Critères du jury
1. **Utilité et impact local** : problème réel, utilisateur précis, portée estimée.
2. **Sécurité by design** : modèle de menace, moindres privilèges, secrets protégés, entrées validées, pas de données personnelles dans les logs.
3. **UX/UI** : fluide sur faible débit et téléphone moyen de gamme, textes simples.
4. **MVP fonctionnel** : démo de bout en bout, installation en une commande, données d'exemple.
5. **Pitch et docs** : démo de 3 min (problème, solution, impact, suite), README avec schéma d'architecture.

## 2. Description du projet

**Problème** : les petits commerçants (marchés, boutiques de quartier) encaissent surtout en espèces ou en mobile money, avec des frais, des délais et peu de traçabilité. Bitcoin/Lightning permet des paiements instantanés à faible coût, mais les outils existants sont trop techniques pour eux.

**Solution** : une application web légère (PWA) qui transforme le téléphone du commerçant en caisse Lightning. Il saisit un montant en FCFA, l'application génère un QR code de paiement, confirme la réception en temps réel et tient le journal des ventes. Une assistance IA permet d'enregistrer les ventes en langage naturel et résume la journée.

**Utilisateur cible** : un vendeur de marché ou un petit commerçant de Dakar, avec un smartphone d'entrée ou de moyenne gamme et une connexion irrégulière.

**Impact visé** : encaisser instantanément sans intermédiaire, réduire les frais, obtenir un historique des ventes. Indicateurs à suivre : nombre de marchands actifs par semaine, nombre de paiements, montant moyen, temps jusqu'à la confirmation.

## 3. Features attendues

### MVP (à livrer impérativement)
- [ ] **Connexion wallet via NWC** (Nostr Wallet Connect) vers Alby Hub, LNbits ou un nœud de test. C'est l'implémentation de wallet exigée.
- [ ] **Saisie du montant en FCFA** avec conversion en sats (taux de change, repli en cache hors ligne).
- [ ] **Génération de facture Lightning** et affichage en QR code.
- [ ] **Confirmation de paiement en temps réel** (notification écran).
- [ ] **Historique des ventes** (stockage local, export simple).
- [ ] **Interface mobile** : un écran principal, gros boutons, textes sans jargon, français.
- [ ] **Installation en une commande** (`docker compose up` ou script) avec données d'exemple.

### Sécurité (attendu par le jury)
- [ ] Secret NWC stocké localement, jamais envoyé à un serveur tiers.
- [ ] Plafond de budget et permissions minimales sur la connexion NWC.
- [ ] Validation de toutes les entrées (montants, texte libre).
- [ ] Aucune donnée personnelle dans les logs.
- [ ] Section « modèle de menace » dans le README.

### Bonus (si le temps le permet)
- [ ] **IA** : saisie d'une vente en langage naturel (« 2 sacs de riz, 15 000 ») et résumé de la journée en français simple.
- [ ] **Nostr** : envoi d'un reçu signé au client en message chiffré.
- [ ] Mode PWA installable, utilisable avec une connexion faible.
- [ ] Wolof ou autre langue locale pour l'interface.

## 4. Livrables de soumission Devpost
- [ ] Description du projet (texte ou vidéo).
- [ ] Dépôt public avec le code et un **README** (installation, schéma d'architecture, contraintes, indicateurs, prochaine itération).
- [ ] **Vidéo de démo de 3 minutes** : problème, solution, impact, suite.
- [ ] Soumission faite avant le **20 nov, 21h (GMT+1)**, avec une marge de sécurité.

## 5. Planning

| Date | Objectif |
|---|---|
| 18 nov | Choix de l'idée, squelette du projet, facture NWC et QR code qui fonctionnent |
| 19 nov | Conversion FCFA/sats, historique, IA, interface soignée |
| 20 nov, jusqu'à 15h | Tests, README, schéma d'architecture, vidéo de démo |
| 20 nov, 15h à 21h | Soumission Devpost |

## 6. Stack proposée
- **Front** : TypeScript, Vite ou Next.js, PWA.
- **Lightning** : `@getalby/sdk` (NWC), Alby Hub ou LNbits pour la démo.
- **IA** : API Claude pour l'analyse des ventes en langage naturel et le résumé.
- **Nostr** : `nostr-tools` (reçus chiffrés).
- **Déploiement** : Docker Compose.

## 7. Répartition de l'équipe
À compléter une fois les compétences de chacun connues.

| Rôle | Personne | Tâches |
|---|---|---|
| Wallet / backend | ? | NWC, factures, confirmation de paiement |
| Front / UX | ? | Interface PWA, QR code, historique |
| IA / Nostr | ? | Saisie en langage naturel, résumé, reçus |
| Docs / pitch | ? | README, schéma, vidéo, soumission Devpost |
