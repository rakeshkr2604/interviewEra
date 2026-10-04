/**
 * Structured resume parse / upload outcomes for APIs and observability.
 */

export type ResumeParseQuality = 'full' | 'degraded' | 'minimal';

export type ResumeHardFailCode =
  | 'EMPTY_FILE'
  | 'LOW_TEXT_EXTRACTION'
  | 'CORRUPT_FILE'
  | 'ENCRYPTED_PDF'
  | 'SCANNED_NO_TEXT'
  | 'WRONG_DOCUMENT_TYPE'
  | 'GARBAGE_CONTENT'
  | 'PARSER_UNAVAILABLE';

export type ResumeParseFailCode =
  | 'NO_RAW_TEXT'
  | 'AI_PARSE_FAILED'
  | 'CONFIG_ERROR';

export type ResumeUserFacingError = {
  success: false;
  code: ResumeHardFailCode | ResumeParseFailCode | string;
  userMessage: string;
  suggestion?: string;
  /** Back-compat alias for clients that read `error`. */
  error: string;
};

export function resumeUserError(
  code: ResumeHardFailCode | ResumeParseFailCode | string,
  userMessage: string,
  suggestion?: string,
): ResumeUserFacingError {
  return {
    success: false,
    code,
    userMessage,
    suggestion,
    error: userMessage,
  };
}

export const RESUME_HARD_FAIL_MESSAGES: Record<
  ResumeHardFailCode,
  { userMessage: string; suggestion: string }
> = {
  EMPTY_FILE: {
    userMessage: 'The uploaded file is empty.',
    suggestion: 'Choose a non-empty PDF or TXT resume and try again.',
  },
  LOW_TEXT_EXTRACTION: {
    userMessage: 'We could only read a very small amount of text from this file.',
    suggestion: 'Try exporting as a standard PDF from Word/Google Docs, or upload a .txt version.',
  },
  CORRUPT_FILE: {
    userMessage: 'This file looks corrupted or could not be opened.',
    suggestion: 'Re-export as PDF from your editor, or upload a .txt copy.',
  },
  ENCRYPTED_PDF: {
    userMessage: 'This PDF appears password-protected.',
    suggestion: 'Remove the password, then export and upload again.',
  },
  SCANNED_NO_TEXT: {
    userMessage:
      "We couldn't read any text from your PDF. It appears to be a scanned document or image-based PDF. Please upload the original resume exported from Word or Google Docs, or a searchable PDF.",
    suggestion: '',
  },
  WRONG_DOCUMENT_TYPE: {
    userMessage: 'This file does not look like a resume or CV.',
    suggestion:
      'Upload a CV with experience, education, or skills. Put job postings in the Job description section — not planners or unrelated PDFs.',
  },
  GARBAGE_CONTENT: {
    userMessage: 'The upload completed, but the resume content was unclear.',
    suggestion: 'Use a standard resume PDF or paste plain text from your CV.',
  },
  PARSER_UNAVAILABLE: {
    userMessage: 'Resume reading is temporarily unavailable.',
    suggestion: 'Wait a minute and retry, or upload a .txt resume.',
  },
};

export function formatResumeUserFacingError(body: {
  userMessage?: string;
  suggestion?: string;
  error?: string;
}): string {
  const msg = (typeof body.userMessage === 'string' && body.userMessage.trim()) ||
    (typeof body.error === 'string' && body.error.trim()) ||
    '';
  const hint = typeof body.suggestion === 'string' ? body.suggestion.trim() : '';
  if (msg && hint) return `${msg} ${hint}`;
  return msg || 'Upload failed. Please try again.';
}

export const PARSE_DEGRADED_WARNING =
  'We extracted most of your resume, but some sections may be incomplete.';

export const PARSE_MINIMAL_WARNING =
  'We saved your resume with limited detail — interview questions may be less personalized.';
