/** Une vente est soit encaissée en Lightning (prouvée), soit saisie à la main (déclarée). */
export type TypeVente = "lightning" | "declaree";

export interface Vente {
  id: string;
  /** Horodatage en secondes Unix. */
  ts: number;
  montantFcfa: number;
  type: TypeVente;
  libelle: string;
  /** Présents seulement pour une vente Lightning : preuve de règlement. */
  facture?: string;
  preimage?: string;
  paymentHash?: string;
}

/** Entrée compacte d'un passeport : [ts, fcfa, "L", facture, preimage] ou [ts, fcfa, "D"]. */
export type LignePasseport =
  | [number, number, "L", string, string]
  | [number, number, "D"];

export interface ContenuPasseport {
  v: 1;
  devise: "XOF";
  debut: number;
  fin: number;
  lignes: LignePasseport[];
}
