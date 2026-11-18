import { useSyncExternalStore } from "react";

// Merchant preferences, stored on the phone only. If storage is blocked or
// full, we keep them in memory: the app must never crash on a storage error.
// The key is also read by the inline script in index.html (theme before first paint).
export const CLE_PREFERENCES = "caisse.preferences.v1";

export type Theme = "clair" | "sombre";

export interface Preferences {
  theme: Theme;
  /** Show the "≈ 12 345 sats" line under amounts. */
  satsVisibles: boolean;
  /** Per-sale ceiling in FCFA (keypad refuses more). */
  plafondFcfa: number;
  /** The 12 recovery words were confirmed as written down. */
  cleSauvegardee: boolean;
  /** "Install on home screen" card dismissed. */
  installationReportee: boolean;
}

export const PLAFOND_DEFAUT = 500_000;
export const PLAFOND_MAX = 10_000_000;

const DEFAUT: Preferences = {
  theme: "clair",
  satsVisibles: true,
  plafondFcfa: PLAFOND_DEFAUT,
  cleSauvegardee: false,
  installationReportee: false,
};

function valider(brut: unknown): Preferences {
  const p = (typeof brut === "object" && brut !== null ? brut : {}) as Partial<Record<keyof Preferences, unknown>>;
  const plafond = Number(p.plafondFcfa);
  return {
    theme: p.theme === "sombre" ? "sombre" : "clair",
    satsVisibles: p.satsVisibles !== false,
    plafondFcfa: Number.isInteger(plafond) && plafond > 0 && plafond <= PLAFOND_MAX ? plafond : PLAFOND_DEFAUT,
    cleSauvegardee: p.cleSauvegardee === true,
    installationReportee: p.installationReportee === true,
  };
}

function lireStockage(): { prefs: Preferences; enregistrees: boolean } {
  try {
    const brut = localStorage.getItem(CLE_PREFERENCES);
    if (brut) return { prefs: valider(JSON.parse(brut)), enregistrees: true };
  } catch { /* blocked or corrupted storage: defaults */ }
  return { prefs: DEFAUT, enregistrees: false };
}

let etat = lireStockage();
const abonnes = new Set<() => void>();

/** False on the very first launch (nothing saved yet): the app shows Welcome. */
export const preferencesEnregistrees = () => etat.enregistrees;
export const lirePreferences = () => etat.prefs;

export function modifierPreferences(changement: Partial<Preferences>): void {
  const prefs = valider({ ...etat.prefs, ...changement });
  etat = { prefs, enregistrees: true };
  try { localStorage.setItem(CLE_PREFERENCES, JSON.stringify(prefs)); } catch { /* memory only */ }
  if (changement.theme) appliquerTheme(prefs.theme);
  abonnes.forEach((cb) => cb());
}

export function usePreferences(): Preferences {
  return useSyncExternalStore(
    (cb) => { abonnes.add(cb); return () => abonnes.delete(cb); },
    () => etat.prefs,
  );
}

/** Applies the theme on <html> and keeps the browser bar colour in sync.
 *  Colours come from the tokens, never hard-coded here. */
export function appliquerTheme(theme: Theme): void {
  const racine = document.documentElement;
  racine.dataset.theme = theme;
  const style = getComputedStyle(racine);
  const couleur = style.getPropertyValue(theme === "sombre" ? "--c-fond" : "--c-primaire").trim();
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", couleur);
}
