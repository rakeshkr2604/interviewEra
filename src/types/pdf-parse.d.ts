declare module 'pdf-parse' {
  export type PdfParseResult = {
    text?: string;
  };

  export default function pdfParse(buffer: Buffer): Promise<PdfParseResult>;
}
