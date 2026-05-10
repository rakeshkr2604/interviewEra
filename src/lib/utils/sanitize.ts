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

