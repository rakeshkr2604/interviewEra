import { z } from 'zod';
import { safeText } from '@/lib/utils/sanitize';
import { halfStarRatingSchema } from '@/lib/validations/schemas';

export const anonymousFeedbackSchema = z.object({
  rating: halfStarRatingSchema.optional().default(3),
  /** Opt-in only — default false; anonymous UI does not currently expose this. */
  consentPublicDisplay: z.boolean().optional().default(false),
  npsScore: z.coerce.number().int().min(0).max(10).nullable().optional().default(null),
  feedbackCategory: z
    .enum(['general', 'bug', 'feature', 'interview', 'report', 'ai_quality'])
    .optional()
    .default('general'),
  message: z
    .string()
    .min(10, 'Please share at least 10 characters of feedback.')
    .max(4000)
    .transform((s) => safeText(s, 2000)),
  pageUrl: z
    .preprocess((v) => (typeof v === 'string' ? v : ''), z.string().max(2048))
    .transform((s) => safeText(s, 2048)),
  email: z
    .string()
    .email()
    .max(254)
    .optional()
    .or(z.literal(''))
    .transform((s) => (s ? s.trim().toLowerCase() : '')),
});

export type AnonymousFeedbackInput = z.infer<typeof anonymousFeedbackSchema>;
