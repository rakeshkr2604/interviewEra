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
    userMessage: 'Your PDF appears image-based and text could not be extracted.',
    suggestion: 'Upload a text-based PDF or a .txt export instead of a scanned photo.',
  },
  WRONG_DOCUMENT_TYPE: {
    userMessage: 'This file reads like a job posting, not your resume.',
    suggestion: 'Upload your CV here and paste the employer JD in the job description section.',
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

export const PARSE_DEGRADED_WARNING =
  'We extracted most of your resume, but some sections may be incomplete.';

export const PARSE_MINIMAL_WARNING =
  'We saved your resume with limited detail — interview questions may be less personalized.';
