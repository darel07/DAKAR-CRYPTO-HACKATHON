const formatNombre = new Intl.NumberFormat("fr-FR");

/** « 15 000 FCFA » : toujours des FCFA pour le commerçant, jamais des sats. */
export function formatFcfa(montant: number): string {
  return `${formatNombre.format(Math.round(montant))} FCFA`;
}

export function formatNombreSimple(n: number): string {
  return formatNombre.format(Math.round(n));
}

const heure = new Intl.DateTimeFormat("fr-FR", { hour: "2-digit", minute: "2-digit" });
const jourLong = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" });

export const formatHeure = (ts: number) => heure.format(new Date(ts * 1000));
export const formatJour = (ts: number) => jourLong.format(new Date(ts * 1000));

/** Clé de regroupement par jour local (AAAA-MM-JJ). */
export function cleJour(ts: number): string {
  const d = new Date(ts * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const j = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${j}`;
}
