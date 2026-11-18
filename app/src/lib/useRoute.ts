import { useEffect, useState } from "react";

export interface Route { chemin: string; param: string | null }

function lire(): Route {
  const brut = window.location.hash.replace(/^#/, "") || "/";
  const [, premier = "", param] = brut.split("/");
  return { chemin: `/${premier}`, param: param ?? null };
}

/** Routage par hash : le lien du passeport fonctionne sans serveur ni réécriture d'URL. */
export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(lire);
  useEffect(() => {
    const maj = () => setRoute(lire());
    window.addEventListener("hashchange", maj);
    return () => window.removeEventListener("hashchange", maj);
  }, []);
  return route;
}

export const aller = (chemin: string) => { window.location.hash = chemin; };
