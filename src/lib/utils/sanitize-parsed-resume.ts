import type { ParsedResume } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';

export function sanitizeParsedResume(input: ParsedResume | unknown): ParsedResume {
  return coerceParsedResume(input);
}
