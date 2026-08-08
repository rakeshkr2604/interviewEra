/**
 * ATS-only PDF layout inspection via pdf.js text-item positions.
 *
 * IMPORTANT: Does NOT modify or wrap `extractText`. Uses a separate pdf.js
 * document open so positional (x,y) data is available for parseability scoring.
 *
 * Achievable signals from pdf.js TextItem.transform:
 *   - Multi-column layout (x-clustering + y-overlap)
 *   - Text in header/footer bands (top/bottom page %)
 *   - Sparse positioned text (image-heavy / weak text layer)
 *   - Grid-like short items (weak table/text-box heuristic)
 *
 * Not achievable without deeper PDF structure parsing:
 *   - True table cell semantics, text-box objects, form fields
 *   - Guaranteed contact-in-header when contact is drawn as vector graphics
 */

import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { assertPdfMagic } from '@/lib/pdf/parser';
import { ensurePdfJsNodeGlobalsSync, hasPdfJsNodeGlobalsReady } from '@/lib/pdf/pdfjs-node-setup';

export interface LayoutTextItem {
  str: string;
  /** PDF user-space X (origin bottom-left). */
  x: number;
  /** PDF user-space Y (origin bottom-left). */
  y: number;
  pageIndex: number;
  pageWidth: number;
  pageHeight: number;
}

export interface PdfLayoutInspectResult {
  available: boolean;
  reason?: string;
  pageCount: number;
  items: LayoutTextItem[];
  totalChars: number;
}

function resolveAssetUrls(): { standardFontDataUrl: string; cMapUrl: string } | null {
  const root = join(process.cwd(), 'node_modules', 'pdfjs-dist');
  const standardFontDataUrl = join(root, 'standard_fonts') + '/';
  const cMapUrl = join(root, 'cmaps') + '/';
  if (existsSync(join(root, 'standard_fonts')) && existsSync(join(root, 'cmaps'))) {
    return { standardFontDataUrl, cMapUrl };
  }
  return null;
}

function itemCoords(item: unknown): { str: string; x: number; y: number } | null {
  if (!item || typeof item !== 'object') return null;
  const o = item as { str?: unknown; transform?: unknown };
  if (typeof o.str !== 'string' || !o.str.trim()) return null;
  if (!Array.isArray(o.transform) || o.transform.length < 6) return null;
  const x = Number(o.transform[4]);
  const y = Number(o.transform[5]);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { str: o.str, x, y };
}

/**
 * Inspect PDF text layout. Returns `available: false` when pdf.js/canvas cannot
 * provide positions (caller should fall back to text-only parseability heuristics).
 */
export async function inspectPdfLayout(
  input: Uint8Array | ArrayBuffer,
): Promise<PdfLayoutInspectResult> {
  // Always copy — pdf.js may transfer/detach the ArrayBuffer backing `data`.
  const source = input instanceof Uint8Array ? input : new Uint8Array(input);
  assertPdfMagic(source);
  const bytes = source.slice();

  ensurePdfJsNodeGlobalsSync();
  if (!hasPdfJsNodeGlobalsReady()) {
    return {
      available: false,
      reason: 'canvas_globals_unavailable',
      pageCount: 0,
      items: [],
      totalChars: 0,
    };
  }

  const assets = resolveAssetUrls();

  type PdfJsPage = {
    getViewport: (o: { scale: number }) => { width: number; height: number };
    getTextContent: () => Promise<{ items: unknown[] }>;
  };
  type PdfJsDoc = {
    numPages: number;
    destroy: () => Promise<void>;
    getPage: (i: number) => Promise<PdfJsPage>;
  };

  let doc: PdfJsDoc | null = null;

  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const opts: Record<string, unknown> = {
      data: bytes,
      useSystemFonts: false,
      disableFontFace: true,
      verbosity: 0,
    };
    if (assets) {
      opts.standardFontDataUrl = assets.standardFontDataUrl;
      opts.cMapUrl = assets.cMapUrl;
      opts.cMapPacked = true;
    }

    doc = (await pdfjs.getDocument(opts).promise) as unknown as PdfJsDoc;
    const items: LayoutTextItem[] = [];
    let totalChars = 0;

    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      for (const raw of content.items) {
        const parsed = itemCoords(raw);
        if (!parsed) continue;
        totalChars += parsed.str.length;
        items.push({
          str: parsed.str,
          x: parsed.x,
          y: parsed.y,
          pageIndex: i - 1,
          pageWidth: viewport.width,
          pageHeight: viewport.height,
        });
      }
    }

    return {
      available: true,
      pageCount: doc.numPages,
      items,
      totalChars,
    };
  } catch (err) {
    console.warn(
      '[ats-layout] inspect failed',
      err instanceof Error ? err.message : err,
    );
    return {
      available: false,
      reason: 'pdfjs_layout_failed',
      pageCount: 0,
      items: [],
      totalChars: 0,
    };
  } finally {
    if (doc) {
      try {
        await doc.destroy();
      } catch {
        /* ignore */
      }
    }
  }
}
