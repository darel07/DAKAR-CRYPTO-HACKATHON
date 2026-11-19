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
  IA_FOURNISSEUR: z
    .enum(["anthropic", "compatible-openai"], { message: "doit valoir anthropic ou compatible-openai" })
    .default("anthropic"),
  ANTHROPIC_API_KEY: z.preprocess(vide, z.string().min(1).optional()),
  // Fournisseur compatible OpenAI (Groq, Gemini, OpenRouter, Mistral, Ollama…) : base, clé, modèle.
  IA_URL_BASE: z.preprocess(
    vide,
    z.url({ message: "doit être une URL complète, par exemple https://api.groq.com/openai/v1" }).optional(),
  ),
  IA_CLE: z.preprocess(vide, z.string().min(1).optional()),
  IA_MODELE: z.preprocess(vide, z.string().min(1).optional()),
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
  iaFournisseur: "anthropic" | "compatible-openai";
  anthropicApiKey: string | undefined;
  iaUrlBase: string | undefined;
  iaCle: string | undefined;
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
  if (c.IA_FOURNISSEUR === "compatible-openai" && c.IA_CLE && !c.IA_URL_BASE) {
    throw new Error("Configuration invalide :\nIA_FOURNISSEUR=compatible-openai demande aussi IA_URL_BASE");
  }
  return {
    host: c.HOST,
    port: c.PORT,
    publicUrl: c.PUBLIC_URL,
    corsOrigins: c.CORS_ORIGINS,
    databasePath: c.DATABASE_PATH,
    frontDist: c.FRONT_DIST,
    iaFournisseur: c.IA_FOURNISSEUR,
    anthropicApiKey: c.ANTHROPIC_API_KEY,
    iaUrlBase: c.IA_URL_BASE?.replace(/\/+$/, ""),
    iaCle: c.IA_CLE,
    iaModele: c.IA_MODELE ?? (c.IA_FOURNISSEUR === "anthropic" ? "claude-opus-5-5" : ""),
    trustProxy: c.TRUST_PROXY,
    logLevel: c.LOG_LEVEL,
    seedDemo: c.SEED_DEMO,
  };
}
