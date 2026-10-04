/**
 * Shared post-extract resume semantic gate for every resume-consuming entry point.
 * Deterministic heuristics only (no LLM) — call after text extraction, before AI/storage.
 */

import {
  assertLooksLikeJobDescription,
  assertLooksLikeResume,
  type DocumentValidation,
} from '@/lib/documents/document-classification';
import { isObviouslyGarbage } from '@/lib/resume/extraction-quality';

export type ResumeDocumentTextValidation =
  | { ok: true }
  | { ok: false; code: 'GARBAGE_CONTENT' | 'WRONG_DOCUMENT_TYPE'; message: string };

/**
 * Reject unusable/garbage text and non-resume documents (trackers, JDs, essays, …).
 * Same classifier as `POST /api/resume/upload`.
 */
export function validateResumeDocumentText(rawText: string): ResumeDocumentTextValidation {
  const text = rawText.trim();
  if (isObviouslyGarbage(text)) {
    return {
      ok: false,
      code: 'GARBAGE_CONTENT',
      message:
        'The content was unclear or unreadable. Upload a text-based resume PDF, DOCX, or TXT.',
    };
  }

  const resumeCheck: DocumentValidation = assertLooksLikeResume(text);
  if (!resumeCheck.ok) {
    return {
      ok: false,
      code: 'WRONG_DOCUMENT_TYPE',
      message: resumeCheck.message,
    };
  }

  return { ok: true };
}

export type JdDocumentTextValidation =
  | { ok: true }
  | { ok: false; code: 'WRONG_JD_TYPE'; message: string };

/** Optional JD field — reject resumes / non-JD prose mistakenly pasted as a job posting. */
export function validateJobDescriptionDocumentText(rawText: string): JdDocumentTextValidation {
  const jdCheck = assertLooksLikeJobDescription(rawText);
  if (!jdCheck.ok) {
    return { ok: false, code: 'WRONG_JD_TYPE', message: jdCheck.message };
  }
  return { ok: true };
}
