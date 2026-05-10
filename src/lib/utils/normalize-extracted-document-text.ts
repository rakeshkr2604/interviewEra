/**
 * PDF/TXT extraction is plain text, not HTML. Do not pass through DOMPurify — it pulls
 * `isomorphic-dompurify` → `jsdom`, which breaks Vercel (ERR_REQUIRE_ESM on @exodus/bytes).
 * Import this module from upload/parse routes instead of `@/lib/utils/sanitize`.
 */
export function normalizeExtractedDocumentText(input: string, maxLength: number): string {
  const withoutNul = input.replace(/\u0000/g, '');
  return withoutNul.trim().slice(0, maxLength);
}
