// Typographie française : espace insécable (U+00A0) avant « : ; ? ! » dans les textes VISIBLES
// (chaînes et texte JSX), jamais dans le code ni les commentaires. Analyse par le parseur de
// Rolldown (TypeScript 7 n'a plus d'API JS) : un « a ? b : c » de code n'est jamais touché.
// node tests/outils/insecables.mjs [--ecrire]   (sans --ecrire : liste seulement, code 1 s'il reste à faire)
import { parseAst } from "rolldown/parseAst";
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const ECRIRE = process.argv.includes("--ecrire");
const RACINE = new URL("../../src/", import.meta.url).pathname;
// U+00A0 et non U+202F : les sous-ensembles de police n'ont pas l'espace fine (voir format.ts).
const MOTIF = /(?<=[\p{L}\p{N}»)%]) ([:;?!])(?=$|[\s"'`»<)])/gu;

function fichiers(dossier) {
  return readdirSync(dossier).flatMap((nom) => {
    const chemin = join(dossier, nom);
    // Les tests unitaires ne sont jamais affichés : on n'y touche pas.
    if (statSync(chemin).isDirectory()) return nom === "__tests__" ? [] : fichiers(chemin);
    return /\.tsx?$/.test(nom) && !/\.(d|test)\.ts$/.test(nom) ? [chemin] : [];
  });
}

let total = 0;
for (const chemin of fichiers(RACINE)) {
  const source = readFileSync(chemin, "utf8");
  const ast = parseAst(source, { lang: chemin.endsWith(".tsx") ? "tsx" : "ts" });
  const plages = [];
  const visiter = (n, parent) => {
    if (!n || typeof n !== "object") return;
    if (Array.isArray(n)) { for (const e of n) visiter(e, parent); return; }
    const texte = (n.type === "Literal" && typeof n.value === "string") || n.type === "TemplateElement" || n.type === "JSXText";
    // Les chemins d'import n'ont pas d'espace avant « : », mais on ne les touche pas par principe.
    if (texte && !(parent && /^(Import|Export)/.test(parent.type))) plages.push([n.start, n.end]);
    for (const [cle, v] of Object.entries(n)) if (cle !== "parent" && v && typeof v === "object") visiter(v, n);
  };
  visiter(ast, null);
  plages.sort((a, b) => a[0] - b[0]);
  let sortie = ""; let curseur = 0; let n = 0;
  for (const [debut, fin] of plages) {
    const morceau = source.slice(debut, fin).replace(MOTIF, (_, p) => { n++; return ` ${p}`.replace(" ", " "); });
    sortie += source.slice(curseur, debut) + morceau;
    curseur = fin;
  }
  sortie += source.slice(curseur);
  if (n > 0) {
    total += n;
    console.log(`${chemin.slice(RACINE.length)} : ${n}`);
    if (ECRIRE) writeFileSync(chemin, sortie);
  }
}
console.log(total ? `${total} espace(s) ${ECRIRE ? "remplacée(s)" : "à remplacer"}` : "typographie OK");
process.exit(!ECRIRE && total ? 1 : 0);
