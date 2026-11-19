import { enregistrerCle } from "./passeport";

/** Les 12 mots restent sur ce téléphone : jamais copiés, jamais envoyés. */
const CLE_MOTS = "passeport.mots.v1";
/** Mots affichés mais pas encore confirmés : on remontre les mêmes si le commerçant revient.
 *  Ils sont aussi sensibles que la clé, qui vit déjà dans le stockage de ce téléphone. */
const CLE_MOTS_EN_ATTENTE = "passeport.mots.attente.v1";
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

const lire = (cle: string): string[] | null => {
  try {
    const brut = localStorage.getItem(cle);
    const mots = brut ? normaliserMots(brut.split(" ")) : [];
    return mots.length === NOMBRE_MOTS ? mots : null;
  } catch {
    return null;
  }
};

/** E2 : mots à afficher. Ceux de la clé actuelle s'ils existent (clé déjà sauvegardée ou
 *  restaurée) ; sinon une nouvelle phrase NIP-06, gardée en attente jusqu'à confirmation.
 *  La clé de signature n'est remplacée qu'à la confirmation (validerMots). */
export async function preparerMots(): Promise<{ mots: string[]; nouvelle: boolean }> {
  const actuels = lire(CLE_MOTS);
  if (actuels) return { mots: actuels, nouvelle: false };
  const enAttente = lire(CLE_MOTS_EN_ATTENTE);
  if (enAttente) return { mots: enAttente, nouvelle: true };
  const { generateSeedWords } = await import("nostr-tools/nip06");
  const mots = generateSeedWords().split(" ");
  try { localStorage.setItem(CLE_MOTS_EN_ATTENTE, mots.join(" ")); } catch { /* affichés une seule fois */ }
  return { mots, nouvelle: true };
}

/** Le commerçant a noté ses mots : la clé de signature dérive désormais d'eux. Les passeports
 *  déjà partagés restent valables (chacun porte sa propre signature). */
export async function validerMots(mots: string[]): Promise<boolean> {
  const ok = await restaurerDepuisMots(mots);
  if (ok) try { localStorage.removeItem(CLE_MOTS_EN_ATTENTE); } catch { /* sans effet */ }
  return ok;
}
