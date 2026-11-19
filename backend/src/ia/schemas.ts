import { z } from "zod";

// Caractères de contrôle (C0, DEL, C1), refusés dans tout texte libre.
// eslint-disable-next-line no-control-regex
const CONTROLE = /[\u0000-\u001f\u007f-\u009f]/;

export const MONTANT_MAX = 10_000_000;

const texteSur = (min: number, max: number, message: string) =>
  z
    .string({ message })
    .transform((s) => s.trim())
    .pipe(
      z
        .string()
        .min(min, { message })
        .max(max, { message })
        .refine((s) => !CONTROLE.test(s), { message: "Le texte contient des caractères non autorisés." }),
    );

export const CorpsAnalyse = z.object({
  texte: texteSur(1, 120, "Le texte doit contenir entre 1 et 120 caractères."),
});

export const Moyen = z.enum(["especes", "wave", "orange_money", "autre"]);
export const Confiance = z.enum(["haute", "moyenne", "basse"]);

/** Sortie attendue de Claude (validée par le SDK avant usage). */
export const VenteIA = z.object({
  libelle: z.string().max(80),
  quantite: z.number().int().positive().nullable(),
  montantFcfa: z.number().int().positive().max(MONTANT_MAX).nullable(),
  moyen: Moyen.nullable(),
  confiance: Confiance,
});
export type VenteIA = z.infer<typeof VenteIA>;

export const ReponseAnalyse = VenteIA.extend({ source: z.enum(["ia", "regle"]) });
export type ReponseAnalyse = z.infer<typeof ReponseAnalyse>;

export const CorpsResume = z
  .object({
    jour: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Le jour doit être au format AAAA-MM-JJ." }),
    totalFcfa: z.number().int().min(0).max(1_000_000_000),
    nbVentes: z.number().int().min(0).max(100_000),
    totalProuveFcfa: z.number().int().min(0).max(1_000_000_000),
    meilleureHeure: z
      .string()
      .regex(/^\d{1,2}h-\d{1,2}h$/, { message: "L'heure doit être au format 11h-12h." })
      .nullable(),
    articlesFrequents: z
      .array(texteSur(1, 40, "Chaque article doit contenir entre 1 et 40 caractères."))
      .max(5, { message: "Cinq articles au maximum." }),
  })
  .refine((c) => c.totalProuveFcfa <= c.totalFcfa, {
    message: "Le total prouvé ne peut pas dépasser le total.",
  });
export type CorpsResume = z.infer<typeof CorpsResume>;

export const ReponseResume = z.object({ resume: z.string(), source: z.enum(["ia", "modele"]) });
export type ReponseResume = z.infer<typeof ReponseResume>;
