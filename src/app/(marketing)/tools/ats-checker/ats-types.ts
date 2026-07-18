/**
 * App-route re-exports of ATS v2 types — must NOT live in a `"use server"` file.
 * Canonical definitions: `@/lib/ats/types`.
 */

export type {
  FindingSeverity,
  Finding,
  ExtractedExperience,
  ExtractedEducation,
  ExtractedResumeData,
  ActionPriority,
  AtsActionItem,
  AtsJdMatch,
  AtsResultV2,
  AtsResult,
  AtsErrorCode,
  AtsState,
} from '@/lib/ats/types';

export { initialState, EMPTY_EXTRACTED } from '@/lib/ats/types';
