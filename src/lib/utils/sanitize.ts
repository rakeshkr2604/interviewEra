import DOMPurify from 'isomorphic-dompurify';

export function stripHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}

export function safeText(input: string, maxLength = 500): string {
  return stripHtml(input).trim().slice(0, maxLength);
}

/**
 * PDF/TXT extraction is plain text, not HTML. Do not pass through DOMPurify — it can
 * mangle angle brackets, emails, and odd PDF streams; use this only for DB `raw_text`.
 */
export function normalizeExtractedDocumentText(input: string, maxLength: number): string {
  const withoutNul = input.replace(/\u0000/g, '');
  return withoutNul.trim().slice(0, maxLength);
}
