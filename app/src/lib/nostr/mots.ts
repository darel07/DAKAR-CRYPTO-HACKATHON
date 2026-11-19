import { enregistrerCle } from "./passeport";

/** Les 12 mots restent sur ce téléphone : jamais copiés, jamais envoyés. */
const CLE_MOTS = "passeport.mots.v1";
export const NOMBRE_MOTS = 12;

export const normaliserMots = (mots: string[]) => mots.map((m) => m.trim().toLowerCase()).filter(Boolean);

/** Restaure l'identité de signature à partir de 12 mots (NIP-06). nostr-tools/nip06 et sa liste
 *  de 2 048 mots ne sont chargés qu'ici : rien de plus dans le bundle de l'Accueil.
 *  Faux si les mots ne forment pas une phrase BIP-39 valide (orthographe, ordre, somme de contrôle). */
export async function restaurerDepuisMots(mots: string[]): Promise<boolean> {
  const liste = normaliserMots(mots);
  if (liste.length !== NOMBRE_MOTS) return false;
  const phrase = liste.join(" ");
  const { validateWords, privateKeyFromSeedWords } = await import("nostr-tools/nip06");
  if (!validateWords(phrase)) return false;
  enregistrerCle(privateKeyFromSeedWords(phrase));
  try { localStorage.setItem(CLE_MOTS, phrase); } catch { /* la clé suffit à signer */ }
  return true;
}
