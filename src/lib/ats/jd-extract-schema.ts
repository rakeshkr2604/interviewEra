import { z } from 'zod';

/**
 * Skill entries should be atomic names (prompt enforces 1–4 words), but a
 * model that returns a sentence anyway must not sink the WHOLE extraction:
 * pre-truncation here, the 80-char cap made one long string fail Zod twice
 * and degrade every list to empty (the Bug B trigger seen in production
 * logs). Truncate-don't-fail; semantic matching still gets a usable phrase.
 */
const SKILL_MAX_CHARS = 100;

const skillString = z
  .string()
  .transform((s) => s.trim().slice(0, SKILL_MAX_CHARS))
  .pipe(z.string().min(1));

const degreeLevelSchema = z.enum(['diploma', 'bachelor', 'master', 'phd']);

/**
 * Minimum education requirement, extracted separately from skills so degree
 * matching can run against resume education entries (level-based) instead of
 * failing lexical skill comparison.
 */
const requiredEducationSchema = z
  .union([
    z.object({
      level: z.union([degreeLevelSchema, z.null(), z.undefined()]).transform((v) => v ?? null),
      field: z
        .union([z.string(), z.null(), z.undefined()])
        .transform((v) => {
          if (v == null) return null;
          const t = String(v).trim();
          return t.length > 0 ? t.slice(0, 120) : null;
        }),
    }),
    z.null(),
    z.undefined(),
  ])
  .transform((v) => {
    // An education object without a level can't be matched — treat as absent.
    if (v == null || v.level == null) return null;
    return { level: v.level, field: v.field };
  })
  .optional()
  .default(null);

/**
 * JD requirements extraction — separate from resume field extraction.
 * Do not invent requirements that aren't stated in the JD text.
 */
export const jdRequirementsSchema = z.object({
  requiredSkills: z.array(skillString).max(30).optional().default([]),
  preferredSkills: z.array(skillString).max(30).optional().default([]),
  requiredEducation: requiredEducationSchema,
  /** Minimum years if explicitly stated; otherwise null. */
  minYearsExperience: z
    .union([z.number(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null || typeof v !== 'number' || !Number.isFinite(v)) return null;
      return Math.max(0, Math.min(40, Math.round(v)));
    })
    .optional()
    .default(null),
  /** Short plain-language summary of the role focus (for embedding). */
  roleSummary: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => {
      if (v == null) return null;
      const t = String(v).trim();
      return t.length > 0 ? t.slice(0, 400) : null;
    })
    .optional()
    .default(null),
});

export type JdRequirementsZod = z.infer<typeof jdRequirementsSchema>;
