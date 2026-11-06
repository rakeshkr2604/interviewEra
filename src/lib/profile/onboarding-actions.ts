import { z } from 'zod';
import { displayNameSchema, phoneNumberSchema } from '@/lib/validations/schemas';
import { EXPERIENCE_LEVELS } from '@/lib/profile/onboarding-state';

const roleSchema = z.string().trim().min(2, 'Enter a target role.').max(120);
const resumeIdSchema = z.string().uuid().nullable().optional();
/** Optional — "more personalized interview questions", never blocks onboarding. */
const targetCompaniesSchema = z.array(z.string().trim().min(1).max(120)).max(5).optional();

export const onboardingActionSchema = z.union([
  z.object({ action: z.literal('start') }).strict(),
  z
    .object({
      action: z.literal('save-step'),
      step: z.literal(1),
      name: displayNameSchema,
      preferredRole: roleSchema,
      phoneNumber: phoneNumberSchema,
      targetCompanies: targetCompaniesSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('save-step'),
      step: z.literal(2),
      experienceLevel: z.enum(EXPERIENCE_LEVELS),
    })
    .strict(),
  z
    .object({
      action: z.literal('save-step'),
      step: z.literal(3),
      resumeId: resumeIdSchema,
    })
    .strict(),
  z
    .object({
      action: z.literal('complete'),
      resumeId: resumeIdSchema,
    })
    .strict(),
]);

export type OnboardingAction = z.infer<typeof onboardingActionSchema>;
