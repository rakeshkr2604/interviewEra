import { z } from 'zod';

const skillString = z
  .string()
  .transform((s) => s.trim())
  .pipe(z.string().min(1).max(80));

/**
 * JD requirements extraction — separate from resume field extraction.
 * Do not invent requirements that aren't stated in the JD text.
 */
export const jdRequirementsSchema = z.object({
  requiredSkills: z.array(skillString).max(30).optional().default([]),
  preferredSkills: z.array(skillString).max(30).optional().default([]),
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
