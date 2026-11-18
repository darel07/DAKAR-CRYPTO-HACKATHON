# Étude de marché et de concurrence (synthèse)

Synthèse du rapport du 18 novembre 2026. Les sources complètes sont dans le rapport détaillé (hors dépôt). Les chiffres signalés « déclaratif » viennent de l'entreprise concernée.

## Verdict
Une caisse Lightning simple est un mauvais pari pour ce hackathon : elle existe déjà en open source, elle est très représentée dans la galerie, et l'argument « réduire les frais » ne tient pas face à Wave. Le projet vend donc une **preuve de revenus vérifiable** pour accéder au microcrédit.

## Concurrence directe
| Outil | Ce qu'il fait | Limite pour notre cible |
|---|---|---|
| Alby BuzzPay | Caisse PWA open source, connexion NWC | Pas de FCFA natif, pas de relevé de revenus |
| Blink Terminal (juillet 2026) | Caisse web, lien pour le personnel, QR imprimable | Pas de NWC, d'export ni de français documenté |
| LNbits TPoS, BTCPay PoS, Breez POS, Swiss Bitcoin Pay | Caisses diverses | Outils techniques, pas de XOF pour certains |
| Tando (Kenya) | Le client paie en Lightning, le marchand reçoit sur M-Pesa | Pas au Sénégal |
| Banxaas | Pont Lightning vers mobile money au Sénégal (environ 700 transactions pour 7 M FCFA en novembre 2025, déclaratif) | Service de conversion, pas une caisse |

Dans le hackathon : environ 8 des 49 projets sont des outils marchands (Jaay, SunuSats, SamaBoutik, Selly, Ojo POS, Soko, SmartPay Africa, etc.). Une caisse Lightning (RAK TAK CASH) a gagné un autre hackathon à Dakar en octobre 2026.

## Marché sénégalais
- Wave détient environ 80 % des encours de monnaie électronique. Paiement gratuit pour le client ; marchand gratuit jusqu'à 20 000 FCFA par jour, puis 1 %.
- 88 % des dépôts de monnaie mobile de l'UEMOA sont retirés en espèces (2024).
- 407 882 unités économiques en 2016, dont 97 % informelles.
- Seuls 20,3 % des adultes ont accès à la microfinance. Les prêteurs informels pratiquent parfois plus de 30 % par mois.
- 96,3 % des commerçants interrogés ne sont pas assurés.
- Transferts de la diaspora : 3,75 Md $ en 2024 (11,6 % du PIB), mais France vers Sénégal déjà peu coûteux.
- Le FCFA est arrimé à l'euro : l'argument « protéger son épargne avec Bitcoin » est faible.

## Adoption du bitcoin
- 8 lieux sur BTC Map pour tout le Sénégal, surtout aux Almadies.
- Salvador (NBER) : 20 % des entreprises acceptaient le bitcoin, 4,9 % des ventes étaient payées en bitcoin, 88 % des entreprises payées en bitcoin le convertissaient en dollars.
- Ce qui marche ailleurs : distribuer d'abord des sats à dépenser (Kibera, Ekasi), ou laisser le client payer en Lightning pendant que le marchand reçoit sa monnaie habituelle (Tando, MoneyBadger).

## Jury
- Mouhamadou Kouta (Banxaas) a gagné bitcoin++ Nairobi 2026 avec WestToEast, un pont mobile money vers M-Pesa via Lightning.
- Kelvin Isievwore (Btrust) : ingénierie.
- Le règlement cite l'originalité, la sécurité, un MVP réel sans maquette et une installation en une commande.
- Sur les six événements africains recensés, les premiers prix vont surtout à l'épargne et aux ponts de règlement. Une seule caisse marchande a gagné.

## Réglementation
- Pas de loi UEMOA spécifique en vigueur. Aucune interdiction de détenir du bitcoin.
- La loi sénégalaise 2024-08 exige un agrément pour changer, conserver ou transférer des crypto-actifs à titre professionnel. Une caisse où le commerçant garde ses clés est probablement hors champ ; la conversion vers Wave ou Orange Money demande probablement l'agrément. À faire vérifier par un juriste.
- La BCEAO a annoncé en mai 2026 un comité pour rédiger un cadre.

## Pourquoi un passeport de revenus
- Le problème du crédit est plus douloureux que les frais de paiement et aucun projet de la galerie ne le revendique.
- Une banque de microfinance nigériane note déjà les marchands sur leurs flux entrants et plafonne le prêt à environ 20 % du flux mensuel. La règle est simple et reproductible.
- Lightning et Nostr servent à rendre une donnée vérifiable (hash de paiement, signature de la clé du commerçant).

## Risques et limites
- **Fraude par auto-paiement** : le commerçant peut se payer lui-même. Réponse : niveaux de preuve (prouvé / déclaré), contresignature client, plafond prudent.
- **Aucune IMF partenaire** : le projet est un pilote à proposer, pas un prêt réel.
- **Volume en sats faible** : d'où les ventes déclarées, pour que le produit serve même sans paiement Lightning.
- **Règlement en FCFA** : à ne pas simuler, à citer comme prochaine itération via un partenaire agréé.
- Plusieurs chiffres 2026 viennent de sources secondaires ou de blogs commerciaux ; les données sont à recouper avant d'être citées dans le pitch.
