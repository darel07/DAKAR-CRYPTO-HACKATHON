import type { FastifyServerOptions } from "fastify";
import type { FastifyRequest } from "fastify";

/** Tronque une IPv4 au /24 et une IPv6 au /48 : assez pour diagnostiquer, pas pour identifier. */
export function tronquerIp(ip: string | undefined): string {
  if (!ip) return "inconnue";
  const v4 = /^(?:::ffff:)?(\d+)\.(\d+)\.(\d+)\.\d+$/.exec(ip);
  if (v4) return `${v4[1]}.${v4[2]}.${v4[3]}.0/24`;
  return `${ip.split(":").slice(0, 3).join(":")}::/48`;
}

/** Chemin sans la chaîne de requête (elle pourrait porter des données). */
const chemin = (url: string) => url.split("?")[0] ?? url;

/** Journaux JSON sans corps de requête, sans en-têtes sensibles et sans IP complète.
 *  Interdits : texte de vente, charge de passeport, clé d'API. */
export function optionsJournal(
  niveau: string,
  flux?: NodeJS.WritableStream,
): NonNullable<FastifyServerOptions["logger"]> {
  return {
    level: niveau,
    ...(flux ? { stream: flux } : {}),
    redact: {
      paths: ["req.headers.authorization", "req.headers.cookie", "req.body", "res.body", "*.apiKey"],
      censor: "[masqué]",
    },
    serializers: {
      req: (req: FastifyRequest) => ({
        id: req.id,
        method: req.method,
        url: chemin(req.url),
        ip: tronquerIp(req.ip),
      }),
    },
  };
}
