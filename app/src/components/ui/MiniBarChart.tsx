import { useRef, useState } from "react";
import type { CSSProperties, PointerEvent } from "react";
import { formatFcfa } from "../../lib/domain/format";

export interface JourGraphe {
  /** Libellé sous la barre (« mar. »). */
  court: string;
  /** Nom complet pour le résumé et la valeur au toucher (« mardi »). */
  long: string;
  /** Total du jour en FCFA. */
  valeur: number;
}

function resumer(jours: JourGraphe[]): string {
  const meilleur = jours.reduce<JourGraphe | null>((m, j) => (!m || j.valeur > m.valeur ? j : m), null);
  if (!meilleur || meilleur.valeur <= 0) return "Ventes des 7 derniers jours : aucune vente";
  return `Ventes des 7 derniers jours, maximum ${meilleur.long} : ${formatFcfa(meilleur.valeur)}`;
}

interface MiniBarChartProps {
  /** Sept jours, du plus ancien au plus récent. */
  jours: JourGraphe[];
  /** Barre du jour (en navy) : la dernière par défaut. */
  indexJour?: number;
}

/** 7 barres en CSS. Une seule phrase pour les lecteurs d'écran (role=img) ; au doigt,
 *  glisser sur le graphe affiche la valeur du jour touché. */
export function MiniBarChart({ jours, indexJour = jours.length - 1 }: MiniBarChartProps) {
  const zone = useRef<HTMLDivElement>(null);
  const [choisi, setChoisi] = useState<number | null>(null);
  const max = Math.max(1, ...jours.map((j) => j.valeur));
  const affiche = jours[choisi ?? indexJour];

  const toucher = (e: PointerEvent<HTMLDivElement>) => {
    const r = zone.current?.getBoundingClientRect();
    if (!r || jours.length === 0) return;
    const i = Math.floor(((e.clientX - r.left) / r.width) * jours.length);
    setChoisi(Math.min(jours.length - 1, Math.max(0, i)));
  };

  return (
    <div
      ref={zone}
      className="graphe"
      // Glisser sur le graphe montre la valeur d'un jour : ce n'est pas un balayage d'onglet.
      data-sans-balayage=""
      role="img"
      aria-label={resumer(jours)}
      onPointerDown={toucher}
      onPointerMove={(e) => { if (e.buttons) toucher(e); }}
    >
      <p className="graphe__valeur">
        {affiche && <>{affiche.long} : <span className="chiffres">{formatFcfa(affiche.valeur)}</span></>}
      </p>
      <div className="graphe__barres">
        {jours.map((j, i) => (
          <span
            key={`${j.court}-${i}`}
            className={["graphe__barre", i === indexJour && "graphe__barre--jour", i === choisi && "graphe__barre--choisie"].filter(Boolean).join(" ")}
            style={{ "--h": j.valeur / max } as CSSProperties}
          />
        ))}
      </div>
      <div className="graphe__jours">
        {jours.map((j, i) => <span key={`${j.court}-${i}`}>{j.court}</span>)}
      </div>
    </div>
  );
}
