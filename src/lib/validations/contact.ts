import { z } from 'zod';
import { safeText } from '@/lib/utils/sanitize';

export const contactFormSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Please enter your name.')
    .max(80)
    .transform((s) => safeText(s, 80)),
  email: z.string().trim().email('Please enter a valid email address.').max(254),
  message: z
    .string()
    .trim()
    .min(10, 'Please share at least 10 characters so we can help.')
    .max(4000)
    .transform((s) => safeText(s, 4000)),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;
