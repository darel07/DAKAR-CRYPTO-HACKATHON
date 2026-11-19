import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import { X } from "lucide-react";

// Un seul toast à la fois, en haut sous la zone sûre, 4 s. Les régions live existent
// dès le chargement (sinon le premier message n'est pas annoncé) ; un toast d'erreur
// passe par role=alert. La disparition est suspendue tant que le focus est dedans.

export type NiveauToast = "info" | "erreur";

interface ActionToast {
  libelle: string;
  onClick(): void;
}

interface Toast {
  id: number;
  message: string;
  niveau: NiveauToast;
  action?: ActionToast;
  /** ms avant disparition ; null = reste jusqu'à fermeture (« Mettre à jour »). */
  duree: number | null;
}

const DUREE_DEFAUT = 4000;
let courant: Toast | null = null;
let compteur = 0;
let dernierMessage = "";
const abonnes = new Set<() => void>();
const emettre = () => abonnes.forEach((cb) => cb());

interface OptionsToast {
  niveau?: NiveauToast;
  action?: ActionToast;
  duree?: number | null;
}

/** Affiche un toast (remplace le précédent). Utilisable hors de React. */
export function afficherToast(message: string, { niveau = "info", action, duree = DUREE_DEFAUT }: OptionsToast = {}): void {
  // VoiceOver ignore un message identique au précédent : une espace insécable le rend différent.
  const texte = message === dernierMessage ? `${message} ` : message;
  dernierMessage = texte;
  courant = { id: ++compteur, message: texte, niveau, action, duree };
  emettre();
}

export function fermerToast(): void {
  courant = null;
  emettre();
}

function abonner(cb: () => void) {
  abonnes.add(cb);
  return () => { abonnes.delete(cb); };
}

function CarteToast({ toast }: { toast: Toast }) {
  const minuteur = useRef<number | undefined>(undefined);
  const demarrer = useCallback(() => {
    window.clearTimeout(minuteur.current);
    if (toast.duree !== null) minuteur.current = window.setTimeout(fermerToast, toast.duree);
  }, [toast.duree]);
  const suspendre = () => window.clearTimeout(minuteur.current);

  useEffect(() => { demarrer(); return suspendre; }, [demarrer]);

  return (
    <div className={`toast toast--${toast.niveau}`} onFocus={suspendre} onBlur={demarrer}>
      <p className="toast__message">{toast.message}</p>
      {toast.action && (
        <button type="button" className="toast__action" onClick={() => { toast.action?.onClick(); fermerToast(); }}>
          {toast.action.libelle}
        </button>
      )}
      <button type="button" className="toast__fermer" aria-label="Fermer le message" onClick={fermerToast}>
        <X aria-hidden="true" />
      </button>
    </div>
  );
}

/** À monter une seule fois, à la racine de l'application. */
export function ToastRegion() {
  const toast = useSyncExternalStore(abonner, () => courant, () => null);
  return (
    <div className="toasts" role="region" aria-label="Notifications">
      <div role="status">{toast?.niveau === "info" && <CarteToast key={toast.id} toast={toast} />}</div>
      <div role="alert">{toast?.niveau === "erreur" && <CarteToast key={toast.id} toast={toast} />}</div>
    </div>
  );
}
