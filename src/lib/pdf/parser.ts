/**
 * Shared PDF text extraction service.
 *
 * Both the resume upload route and the ATS checker server action route
 * through this module, so error handling and the parser fallback chain
 * stay consistent. Throws one of the typed errors below — callers map
 * those to user-facing codes; never surface the raw exception.
 */

export type PDFErrorCode = 'ENCRYPTED' | 'SCANNED_NO_TEXT' | 'CORRUPT' | 'UNSUPPORTED';

export class PDFEncryptedError extends Error {
  readonly code: PDFErrorCode = 'ENCRYPTED';
  constructor(message = 'PDF is password-protected') {
    super(message);
    this.name = 'PDFEncryptedError';
  }
}

export class PDFScannedNoTextError extends Error {
  readonly code: PDFErrorCode = 'SCANNED_NO_TEXT';
  constructor(message = 'PDF contains no extractable text') {
    super(message);
    this.name = 'PDFScannedNoTextError';
  }
}

export class PDFCorruptError extends Error {
  readonly code: PDFErrorCode = 'CORRUPT';
  constructor(message = 'PDF appears corrupt') {
    super(message);
    this.name = 'PDFCorruptError';
  }
}

export class PDFUnsupportedError extends Error {
  readonly code: PDFErrorCode = 'UNSUPPORTED';
  constructor(message = 'Unsupported file type') {
    super(message);
    this.name = 'PDFUnsupportedError';
  }
}

const MIN_USEFUL_CHARS = 20;

/** pdfjs-dist text item subset we rely on. */
interface PdfJsTextItem {
  str?: string;
}

function classifyAndThrow(err: unknown): never {
  const ctor =
    (err as { constructor?: { name?: string } } | null)?.constructor?.name ?? '';
  const message = err instanceof Error ? err.message : String(err);

  if (ctor === 'PasswordException' || /password|encrypted/i.test(message)) {
    throw new PDFEncryptedError();
  }
  if (
    ctor === 'InvalidPDFException' ||
    ctor === 'FormatError' ||
    /invalid pdf|format error|missing pdf|stream must|corrupt/i.test(message)
  ) {
    throw new PDFCorruptError();
  }
  throw new PDFCorruptError(`PDF could not be parsed (${message})`);
}

async function tryPdfParse(bytes: Uint8Array): Promise<string> {
  const { PDFParse } = await import('pdf-parse');
  const parser = new PDFParse({ data: bytes });
  try {
    const result = await parser.getText();
    return (result.text ?? '').trim();
  } finally {
    await parser.destroy();
  }
}

async function tryPdfJs(bytes: Uint8Array): Promise<string> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  const doc = await pdfjs.getDocument({
    data: bytes,
    useSystemFonts: true,
    disableFontFace: true,
    isEvalSupported: false,
  }).promise;

  try {
    let text = '';
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      const pageText = (content.items as PdfJsTextItem[])
        .map((it) => (typeof it.str === 'string' ? it.str : ''))
        .join(' ');
      text += pageText + '\n';
    }
    return text.trim();
  } finally {
    await doc.destroy();
  }
}

/**
 * Extract text from PDF bytes. Tries pdf-parse first, falls back to
 * pdfjs-dist on either an internal error OR an empty/whitespace result
 * (some PDFs trip pdf-parse v2's wrapper but parse cleanly via pdfjs).
 */
export async function extractText(input: Uint8Array | ArrayBuffer): Promise<string> {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);

  let primaryError: unknown = null;
  try {
    const text = await tryPdfParse(bytes);
    if (text.length >= MIN_USEFUL_CHARS) return text;
    // Empty / too-short — fall through to pdfjs before declaring scanned.
  } catch (err) {
    // Encrypted is terminal — no fallback can help.
    const ctor = (err as { constructor?: { name?: string } } | null)?.constructor?.name;
    const msg = err instanceof Error ? err.message : String(err);
    if (ctor === 'PasswordException' || /password|encrypted/i.test(msg)) {
      throw new PDFEncryptedError();
    }
    primaryError = err;
  }

  try {
    const text = await tryPdfJs(bytes);
    if (text.length >= MIN_USEFUL_CHARS) return text;
    throw new PDFScannedNoTextError();
  } catch (err) {
    if (err instanceof PDFScannedNoTextError) throw err;
    if (err instanceof PDFEncryptedError) throw err;
    if (err instanceof PDFCorruptError) throw err;
    classifyAndThrow(primaryError ?? err);
  }
}
