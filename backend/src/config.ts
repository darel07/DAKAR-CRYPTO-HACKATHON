import { z } from "zod";

const booleen = z
  .enum(["true", "false"], { message: "doit valoir true ou false" })
  .default("false")
  .transform((v) => v === "true");

const vide = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

const SchemaConfig = z.object({
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  PUBLIC_URL: z
    .url({ message: "doit être une URL complète, par exemple http://localhost:8080" })
    .default("http://localhost:8080")
    .transform((u) => u.replace(/\/+$/, "")),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) =>
      s
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean),
    )
    .refine((liste) => !liste.includes("*"), { message: "« * » est interdit : listez les origines" }),
  DATABASE_PATH: z.string().min(1).default("/data/caisse.sqlite"),
  FRONT_DIST: z.string().min(1).default("../app/dist"),
  ANTHROPIC_API_KEY: z.preprocess(vide, z.string().min(1).optional()),
  IA_MODELE: z.string().min(1).default("claude-opus-5-5"),
  TRUST_PROXY: booleen,
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug"], {
      message: "doit valoir fatal, error, warn, info ou debug",
    })
    .default("info"),
  SEED_DEMO: booleen,
});

export interface Config {
  host: string;
  port: number;
  publicUrl: string;
  corsOrigins: string[];
  databasePath: string;
  frontDist: string;
  anthropicApiKey: string | undefined;
  iaModele: string;
  trustProxy: boolean;
  logLevel: "fatal" | "error" | "warn" | "info" | "debug";
  seedDemo: boolean;
}

/** Lit l'environnement une seule fois. Lève une erreur lisible si une valeur est invalide :
 *  le service refuse alors de démarrer plutôt que de tourner avec une configuration douteuse. */
export function lireConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const res = SchemaConfig.safeParse(env);
  if (!res.success) {
    const details = res.error.issues.map((i) => `${i.path.join(".")} : ${i.message}`).join("\n");
    throw new Error(`Configuration invalide :\n${details}`);
  }
  const c = res.data;
  return {
    host: c.HOST,
    port: c.PORT,
    publicUrl: c.PUBLIC_URL,
    corsOrigins: c.CORS_ORIGINS,
    databasePath: c.DATABASE_PATH,
    frontDist: c.FRONT_DIST,
    anthropicApiKey: c.ANTHROPIC_API_KEY,
    iaModele: c.IA_MODELE,
    trustProxy: c.TRUST_PROXY,
    logLevel: c.LOG_LEVEL,
    seedDemo: c.SEED_DEMO,
  };
}
