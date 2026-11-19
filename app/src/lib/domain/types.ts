/** Une vente est soit encaissée en Lightning (prouvée), soit saisie à la main (déclarée). */
export type TypeVente = "lightning" | "declaree";

/** Moyen d'une vente déclarée (E6). Absent sur les anciennes ventes. */
export type MoyenVente = "especes" | "wave" | "autre";

export interface Vente {
  id: string;
  /** Horodatage en secondes Unix. */
  ts: number;
  montantFcfa: number;
  type: TypeVente;
  libelle: string;
  /** Encaissée en mode démonstration : facture factice, jamais présentée comme prouvée. */
  demo?: boolean;
  /** Vente déclarée : espèces, Wave ou autre (choisi sur E6). */
  moyen?: MoyenVente;
  /** Présents seulement pour une vente Lightning : preuve de règlement. */
  facture?: string;
  preimage?: string;
  paymentHash?: string;
  /** Identifiant du reçu déposé sur le serveur (#/recu-client/r/<id>), si le commerçant l'a envoyé. */
  recuId?: string;
  /** Confirmation signée par le client (E13). Jointe à la ligne du passeport : le prêteur la revérifie. */
  confirmation?: EvenementSigne;
}

/** Événement Nostr signé (NIP-01), tel qu'il circule entre le client, le commerçant et le prêteur. */
export interface EvenementSigne {
  id: string;
  pubkey: string;
  created_at: number;
  kind: number;
  tags: string[][];
  content: string;
  sig: string;
}

/** Entrée compacte d'un passeport : [ts, fcfa, "L", facture, preimage, confirmation?] ou [ts, fcfa, "D"].
 *  Le 6e élément, facultatif, est la confirmation signée du client (#18). */
export type LignePasseport =
  | [number, number, "L", string, string]
  | [number, number, "L", string, string, EvenementSigne]
  | [number, number, "D"];

export interface ContenuPasseport {
  v: 1;
  devise: "XOF";
  debut: number;
  fin: number;
  lignes: LignePasseport[];
}
