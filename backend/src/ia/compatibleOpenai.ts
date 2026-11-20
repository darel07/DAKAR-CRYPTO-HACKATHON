import type { ClientIA } from "./claude.js";
import { CONSIGNE_ANALYSE, CONSIGNE_RESUME } from "./claude.js";
import { VenteIA, type CorpsResume, type VenteIA as TypeVente } from "./schemas.js";

/** Fournisseur « compatible OpenAI » (POST {base}/chat/completions) : Groq, Gemini, OpenRouter,
 *  Mistral, Ollama… Même contrat que le client Claude : null si la réponse n'est pas exploitable,
 *  erreur levée en cas de panne ; le service applique alors la règle locale. */

const DELAI_MS = 8_000;

/** Ces modèles n'ont pas de sortie structurée par schéma garantie : on décrit le JSON attendu
 *  et on valide la réponse avec le même schéma zod que pour Claude. */
const FORMAT_JSON = `
Réponds uniquement par un objet JSON avec exactement ces clés :
{"libelle": string (80 caractères max), "quantite": entier ou null, "montantFcfa": entier ou null,
 "moyen": "especes" | "wave" | "orange_money" | "autre" | null, "confiance": "haute" | "moyenne" | "basse"}

Exemples (entrée → sortie) :
« 2 sacs de riz, 15 000 » → {"libelle":"2 sacs de riz","quantite":2,"montantFcfa":15000,"moyen":null,"confiance":"haute"}
« tissu 12k orange money » → {"libelle":"tissu","quantite":null,"montantFcfa":12000,"moyen":"orange_money","confiance":"haute"}
« savon 2 mille en espèces » → {"libelle":"savon","quantite":null,"montantFcfa":2000,"moyen":"especes","confiance":"haute"}
« quinze mille pour le sucre » → {"libelle":"sucre","quantite":null,"montantFcfa":15000,"moyen":null,"confiance":"moyenne"}
« 3 pains à 150 » → {"libelle":"3 pains","quantite":3,"montantFcfa":450,"moyen":null,"confiance":"moyenne"}
« merci » → {"libelle":"","quantite":null,"montantFcfa":null,"moyen":null,"confiance":"basse"}
Le libellé ne reprend jamais un exemple : il vient uniquement de la phrase reçue.`;

interface ReponseChat {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
}

async function discuter(
  base: string,
  cle: string,
  corps: Record<string, unknown>,
): Promise<{ texte: string; fin: string | undefined } | null> {
  const r = await fetch(`${base}/chat/completions`, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${cle}` },
    body: JSON.stringify(corps),
    signal: AbortSignal.timeout(DELAI_MS),
  });
  if (!r.ok) throw new Error(`fournisseur IA : statut ${r.status}`);
  const choix = ((await r.json()) as ReponseChat).choices?.[0];
  const texte = choix?.message?.content?.trim();
  return texte ? { texte, fin: choix?.finish_reason } : null;
}

/** Retire un éventuel bloc ```json … ``` autour de la réponse. */
const sansBalises = (t: string) => t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");

async function analyser(base: string, cle: string, modele: string, texte: string): Promise<TypeVente | null> {
  const r = await discuter(base, cle, {
    model: modele,
    temperature: 0,
    max_tokens: 300,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: CONSIGNE_ANALYSE + FORMAT_JSON },
      { role: "user", content: texte },
    ],
  });
  if (!r || r.fin === "content_filter" || r.fin === "length") return null;
  try {
    const vente = VenteIA.safeParse(JSON.parse(sansBalises(r.texte)));
    return vente.success ? vente.data : null;
  } catch {
    return null;
  }
}

async function resumer(
  base: string,
  cle: string,
  modele: string,
  chiffres: CorpsResume,
): Promise<string | null> {
  const r = await discuter(base, cle, {
    model: modele,
    temperature: 0.2,
    max_tokens: 300,
    messages: [
      { role: "system", content: CONSIGNE_RESUME },
      { role: "user", content: JSON.stringify(chiffres) },
    ],
  });
  return r && r.fin !== "content_filter" && r.fin !== "length" ? r.texte : null;
}

export function creerClientCompatible(base: string, cle: string, modele: string): ClientIA {
  return {
    analyser: (texte) => analyser(base, cle, modele, texte),
    resumer: (chiffres) => resumer(base, cle, modele, chiffres),
  };
}

/** Modèles proposés par le fournisseur (GET {base}/models), pour choisir IA_MODELE. */
export async function listerModeles(base: string, cle: string): Promise<string[]> {
  const r = await fetch(`${base}/models`, {
    headers: { authorization: `Bearer ${cle}` },
    signal: AbortSignal.timeout(DELAI_MS),
  });
  if (!r.ok) throw new Error(`fournisseur IA : statut ${r.status}`);
  const json = (await r.json()) as { data?: { id?: unknown }[] };
  return (json.data ?? []).flatMap((m) => (typeof m.id === "string" ? [m.id] : [])).sort();
}
