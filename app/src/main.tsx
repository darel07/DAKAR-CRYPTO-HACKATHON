import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { LucideProvider } from "lucide-react";
import { App } from "./App";
import { demarrerPwa } from "./lib/pwa";
import "./styles/globals.css";

/** Trait des icônes Lucide partout (brief), même valeur que le token --trait. */
const TRAIT_ICONES = 1.75;

demarrerPwa();

createRoot(document.getElementById("racine")!).render(
  <StrictMode>
    <LucideProvider strokeWidth={TRAIT_ICONES}>
      <App />
    </LucideProvider>
  </StrictMode>,
);
