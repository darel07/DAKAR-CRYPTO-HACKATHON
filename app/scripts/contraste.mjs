// Measures WCAG 2.1 contrast for every meaningful colour pair of tokens.css.
// Usage: node scripts/contraste.mjs   (exit code 1 if a pair fails)
import { readFileSync } from "node:fs";

const css = readFileSync(new URL("../src/styles/tokens.css", import.meta.url), "utf8");
const bloc = (sel) => css.slice(css.indexOf(sel), css.indexOf("}", css.indexOf(sel)));
const lire = (texte) => Object.fromEntries([...texte.matchAll(/--(c-[\w-]+):\s*(#[0-9A-Fa-f]{6})/g)].map((m) => [m[1], m[2]]));
const clair = lire(bloc(":root {"));
const sombre = { ...clair, ...lire(bloc(':root[data-theme="sombre"]')) };

const lum = (hex) => {
  const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};
const ratio = (a, b) => { const [h, l] = [lum(a), lum(b)].sort((x, y) => y - x); return (h + 0.05) / (l + 0.05); };

// [foreground, background, minimum]
const PAIRES = [
  ["c-texte", "c-fond", 4.5], ["c-texte", "c-surface", 4.5], ["c-texte", "c-surface-2", 4.5],
  ["c-texte-doux", "c-fond", 4.5], ["c-texte-doux", "c-surface", 4.5],
  ["c-primaire", "c-fond", 4.5], ["c-primaire", "c-surface", 4.5],
  ["c-sur-primaire", "c-primaire-cta", 4.5], ["c-sur-ambre", "c-ambre", 4.5],
  ["c-prouve-texte", "c-prouve-fond", 4.5], ["c-declare-texte", "c-declare-fond", 4.5],
  ["c-erreur-texte", "c-erreur-fond", 4.5], ["c-erreur-texte", "c-surface", 4.5],
  ["c-bord-champ", "c-surface", 3], ["c-bord-champ", "c-fond", 3],
  // Neutral badge, info alert, pressed rows; inverted toast (fond text on texte background)
  ["c-texte-doux", "c-surface-h", 4.5], ["c-texte", "c-surface-h", 4.5], ["c-fond", "c-texte", 4.5],
  // Demo wallet pill, offline banner
  ["c-declare-texte", "c-fond", 4.5],
  // Paiement reçu (E5): secondary text on the green background
  ["c-texte-doux", "c-prouve-fond", 4.5], ["c-texte", "c-prouve-fond", 4.5], ["c-prouve-texte", "c-surface", 4.5],
];

let echecs = 0;
for (const [nom, theme] of [["clair", clair], ["sombre", sombre]]) {
  console.log(`\n== Thème ${nom}`);
  for (const [av, ar, min] of PAIRES) {
    const r = ratio(theme[av], theme[ar]);
    const ok = r >= min;
    if (!ok) echecs++;
    console.log(`${ok ? "ok   " : "ÉCHEC"} ${av.padEnd(16)} sur ${ar.padEnd(15)} ${r.toFixed(2)}:1 (min ${min})`);
  }
}
// Success fill with white text (light) / success colour as text on fond (dark)
const s1 = ratio("#FFFFFF", clair["c-succes"]), s2 = ratio(sombre["c-succes"], sombre["c-fond"]);
console.log(`\nblanc sur c-succes (clair) ${s1.toFixed(2)}:1, c-succes sur fond (sombre) ${s2.toFixed(2)}:1`);
if (s1 < 4.5 || s2 < 4.5) echecs++;
console.log(echecs ? `\n${echecs} paire(s) en échec` : "\nToutes les paires passent.");
process.exit(echecs ? 1 : 0);
