import { z } from 'zod';

/** Accept string | null | undefined | ""; normalize empty → null. */
const nullableString = z
  .union([z.string(), z.null(), z.undefined()])
  .transform((v) => {
    if (v == null) return null;
    const t = String(v).trim();
    return t.length > 0 ? t : null;
  });

const experienceSchema = z.object({
  company: nullableString.optional().default(null),
  title: nullableString.optional().default(null),
  startDate: nullableString.optional().default(null),
  endDate: nullableString.optional().default(null),
});

const educationSchema = z.object({
  institution: nullableString.optional().default(null),
  degree: nullableString.optional().default(null),
  year: nullableString.optional().default(null),
});

/**
 * Strict extraction schema — LLM must not invent fields.
 * Arrays default to [] when missing; scalar fields stay null when absent.
 */
export const extractedResumeSchema = z.object({
  name: nullableString.optional().default(null),
  email: nullableString.optional().default(null),
  phone: nullableString.optional().default(null),
  linkedin: nullableString.optional().default(null),
  location: nullableString.optional().default(null),
  experience: z.array(experienceSchema).max(20).optional().default([]),
  education: z.array(educationSchema).max(12).optional().default([]),
  skills: z
    .array(z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(80)))
    .max(40)
    .optional()
    .default([]),
});

export type ExtractedResumeZod = z.infer<typeof extractedResumeSchema>;
