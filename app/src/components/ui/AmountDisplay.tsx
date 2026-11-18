import { formatDateCourte, formatNombreSimple } from "../../lib/domain/format";

interface Cours {
  /** Secondes Unix de la mise à jour du cours. */
  majLe: number;
  enCache: boolean;
}

interface AmountDisplayProps {
  /** Montant en FCFA (0 = vide). */
  montant: number;
  /** Équivalent en sats ; null si la préférence « Afficher l'équivalent en sats » est coupée. */
  sats?: number | null;
  /** Cours utilisé : toujours affiché avec son heure, et signalé s'il vient du cache. */
  cours?: Cours | null;
  taille?: "principal" | "secondaire";
  /** Libellé au-dessus (« Quel montant souhaitez-vous encaisser ? »). */
  libelle?: string;
  /** Message sous le montant (plafond dépassé, montant invalide, cours indisponible). */
  message?: string | null;
}

/** Le montant en FCFA est le héros : chiffres tabulaires, unité plus petite pour que
 *  les chiffres se lisent d'un coup d'œil. Les lignes secondaires gardent leur hauteur
 *  même vides, pour que le pavé ne saute pas pendant la saisie. */
export function AmountDisplay({ montant, sats, cours, taille = "principal", libelle, message }: AmountDisplayProps) {
  const vide = montant <= 0;
  return (
    <div className={`montant montant--${taille}`}>
      {libelle && <p className="montant__libelle">{libelle}</p>}
      <p className={`montant__valeur${vide ? " montant__valeur--vide" : ""}`} aria-live="polite">
        <span className="chiffres">{formatNombreSimple(montant)}</span>
        {" "}
        <span className="montant__devise">FCFA</span>
      </p>
      {sats !== null && sats !== undefined && (
        <p className="montant__sats chiffres" aria-hidden={vide || undefined}>
          {vide ? " " : `≈ ${formatNombreSimple(sats)} sats`}
        </p>
      )}
      {cours && (
        <p className="montant__cours">
          Cours du {formatDateCourte(cours.majLe)}{cours.enCache ? " (dernier cours connu)" : ""}
        </p>
      )}
      {message && <p className="montant__message" role="alert">{message}</p>}
    </div>
  );
}
