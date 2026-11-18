const formatNombre = new Intl.NumberFormat("fr-FR");

/** Intl sépare les milliers par une espace fine insécable (U+202F), presque invisible dans
 *  nos polices aux grandes tailles (« 12500 ») : on la remplace par une espace insécable. */
const grouper = (n: number) => formatNombre.format(Math.round(n)).replace(/ /g, " ");

/** « 15 000 FCFA » : toujours des FCFA pour le commerçant, jamais des sats. */
export function formatFcfa(montant: number): string {
  return `${grouper(montant)} FCFA`;
}

export function formatNombreSimple(n: number): string {
  return grouper(n);
}

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

const jourMois = new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "2-digit" });
const dateComplete = new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short", year: "numeric" });

export const formatHeure = (ts: number) => heure.format(new Date(ts * 1000));
export const formatJour = (ts: number) => jourLong.format(new Date(ts * 1000));
/** « 18/11 à 14:32 » : date du cours. */
export const formatDateCourte = (ts: number) => `${jourMois.format(new Date(ts * 1000))} à ${formatHeure(ts)}`;
/** « 18 nov. 2026 à 14:35 » : date d'une vente. */
export const formatDateHeure = (ts: number) => `${dateComplete.format(new Date(ts * 1000))} à ${formatHeure(ts)}`;

/** « Aujourd'hui », « Hier », puis « lundi 16 novembre ». */
export function libelleJour(ts: number, maintenant = Date.now() / 1000): string {
  const cle = cleJour(ts);
  if (cle === cleJour(maintenant)) return "Aujourd'hui";
  if (cle === cleJour(maintenant - 86400)) return "Hier";
  return formatJour(ts);
}

/** « 3f9a…c21 » : 4 premiers et 3 derniers caractères de la référence de paiement. */
export const referenceCourte = (hash: string) => `${hash.slice(0, 4)}…${hash.slice(-3)}`;

/** Clé de regroupement par jour local (AAAA-MM-JJ). */
export function cleJour(ts: number): string {
  const d = new Date(ts * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}
