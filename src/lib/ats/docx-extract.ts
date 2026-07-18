/**
 * DOCX text extraction for the ATS checker — parallel to the PDF `extractText` path.
 * Uses mammoth raw text only (no page coordinates / header-footer bands).
 */

import mammoth from 'mammoth';

export class DocxCorruptError extends Error {
  readonly code = 'DOCX_CORRUPT' as const;
  constructor(message = 'This Word document could not be read. Re-save as .docx and try again.') {
    super(message);
    this.name = 'DocxCorruptError';
  }
}

export class DocxEmptyError extends Error {
  readonly code = 'DOCX_EMPTY' as const;
  constructor(
    message = 'No readable text was found in this Word document. If it is image-only, export a text-based .docx or .pdf.',
  ) {
    super(message);
    this.name = 'DocxEmptyError';
  }
}

/**
 * Extract plain text from a .docx buffer via mammoth.
 * Does not attempt layout/column detection — mammoth has no page geometry.
 */
export async function extractDocxText(bytes: Uint8Array): Promise<string> {
  let result: { value: string; messages: unknown[] };
  try {
    // mammoth types accept Buffer; Uint8Array is fine at runtime in Node.
    result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error('[ats-checker] docx extract failed', detail);
    throw new DocxCorruptError();
  }

  const text = (result.value ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) {
    throw new DocxEmptyError();
  }
  return text;
}

/** Strip duplicated trailing .docx extensions (ATS-local; does not touch PDF parser helpers). */
export function normalizeDocxFileName(name: string): string {
  return name.replace(/(\.docx)(?:\.docx)+$/i, '$1');
}
