// Copie dans le presse-papiers. L'API Clipboard n'existe qu'en contexte sécurisé
// (https ou localhost) : quand le téléphone ouvre le serveur de dev par son
// adresse réseau (http://192.168.x.x), elle manque. On se replie alors sur
// execCommand, qui doit s'exécuter pendant le geste de l'utilisateur.

function copieAncienne(texte: string): boolean {
  const champ = Object.assign(document.createElement("textarea"), { value: texte });
  champ.setAttribute("readonly", "");
  champ.style.cssText = "position:fixed;inset-block-start:0;opacity:0";
  document.body.append(champ);
  champ.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    champ.remove();
  }
}

/** Vrai si le texte est bien copié. Ne lève jamais d'erreur. */
export async function copierTexte(texte: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(texte);
    return true;
  } catch {
    return copieAncienne(texte);
  }
}
