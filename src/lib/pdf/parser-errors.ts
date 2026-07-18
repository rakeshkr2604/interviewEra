/**
 * Typed PDF extraction failures for server routes and ATS tool.
 * Callers map these to stable API codes — never expose raw upstream errors.
 */

export type PDFParseUserCode =
  | 'ENCRYPTED'
  | 'SCANNED_NO_TEXT'
  | 'CORRUPT'
  | 'UNSUPPORTED'
  /** pdfjs-dist standard_fonts/cmaps absent from traced bundle */
  | 'PARSER_UNAVAILABLE'
  /** Node canvas/globals or parser runtime failed — not a bad file */
  | 'PARSER_RUNTIME'
  /** Resume uploads reject PDFs above the page guardrail */
  | 'TOO_MANY_PAGES';

export class PDFEncryptedError extends Error {
  readonly code: Extract<PDFParseUserCode, 'ENCRYPTED'> = 'ENCRYPTED';
  constructor(message = 'PDF is password-protected') {
    super(message);
    this.name = 'PDFEncryptedError';
  }
}

export class PDFScannedNoTextError extends Error {
  readonly code: Extract<PDFParseUserCode, 'SCANNED_NO_TEXT'> = 'SCANNED_NO_TEXT';
  constructor(message = 'PDF contains no extractable text') {
    super(message);
    this.name = 'PDFScannedNoTextError';
  }
}

export class PDFCorruptError extends Error {
  readonly code: Extract<PDFParseUserCode, 'CORRUPT'> = 'CORRUPT';
  constructor(message = 'PDF appears corrupt') {
    super(message);
    this.name = 'PDFCorruptError';
  }
}

export class PDFUnsupportedError extends Error {
  readonly code: Extract<PDFParseUserCode, 'UNSUPPORTED'> = 'UNSUPPORTED';
  constructor(message = 'Unsupported file type') {
    super(message);
    this.name = 'PDFUnsupportedError';
  }
}

/** Traced deployment is missing pdfjs-dist font/cmap files on disk. */
export class PDFParserUnavailableError extends Error {
  readonly code: Extract<PDFParseUserCode, 'PARSER_UNAVAILABLE'> = 'PARSER_UNAVAILABLE';
  constructor(message = 'PDF parser assets are unavailable on server') {
    super(message);
    this.name = 'PDFParserUnavailableError';
  }
}

/** Node runtime / canvas shim failure — differentiate from corrupt uploads. */
export class PDFParserRuntimeError extends Error {
  readonly code: Extract<PDFParseUserCode, 'PARSER_RUNTIME'> = 'PARSER_RUNTIME';
  constructor(message = 'PDF parser runtime failed') {
    super(message);
    this.name = 'PDFParserRuntimeError';
  }
}

export class PDFTooManyPagesError extends Error {
  readonly code: Extract<PDFParseUserCode, 'TOO_MANY_PAGES'> = 'TOO_MANY_PAGES';
  readonly pageCount: number;
  readonly maxPages: number;
  constructor(pageCount: number, maxPages: number) {
    super(`PDF has ${pageCount} pages; maximum allowed is ${maxPages}`);
    this.name = 'PDFTooManyPagesError';
    this.pageCount = pageCount;
    this.maxPages = maxPages;
  }
}
