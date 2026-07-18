import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import {
  DocxCorruptError,
  DocxEmptyError,
  extractDocxText,
  normalizeDocxFileName,
} from '@/lib/ats/docx-extract';
import { analyzeParseability } from '@/lib/ats/parseability';

async function buildMinimalDocx(paragraphs: string[]): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  const body = paragraphs
    .map(
      (p) =>
        `<w:p><w:r><w:t xml:space="preserve">${p
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')}</w:t></w:r></w:p>`,
    )
    .join('');
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>${body}<w:sectPr/></w:body>
</w:document>`,
  );
  const buf = await zip.generateAsync({ type: 'uint8array' });
  return buf;
}

async function buildTableDocx(): Promise<Uint8Array> {
  const zip = new JSZip();
  zip.file(
    '[Content_Types].xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`,
  );
  zip.folder('_rels')?.file(
    '.rels',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`,
  );
  zip.folder('word')?.file(
    'document.xml',
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:tbl>
      <w:tr>
        <w:tc><w:p><w:r><w:t>Left column experience describing shipped products</w:t></w:r></w:p></w:tc>
        <w:tc><w:p><w:r><w:t>Right skills rail TypeScript React Node</w:t></w:r></w:p></w:tc>
      </w:tr>
    </w:tbl>
    <w:p><w:r><w:t>Experience</w:t></w:r></w:p>
    <w:p><w:r><w:t>Education</w:t></w:r></w:p>
    <w:p><w:r><w:t>Skills</w:t></w:r></w:p>
    <w:sectPr/>
  </w:body>
</w:document>`,
  );
  return zip.generateAsync({ type: 'uint8array' });
}

describe('extractDocxText', () => {
  it('extracts paragraph text from a valid .docx', async () => {
    const bytes = await buildMinimalDocx([
      'Priya Sharma',
      'priya@example.com',
      'Experience',
      'Acme Corp — Jan 2020 – Present',
      'Built APIs and dashboards for campus hiring.',
      'Education',
      'Skills',
      'TypeScript, React, PostgreSQL',
    ]);
    const text = await extractDocxText(bytes);
    expect(text).toContain('Priya Sharma');
    expect(text).toContain('Experience');
    expect(text).toContain('TypeScript');
  });

  it('flattens table cells to sequential text (no column geometry)', async () => {
    const bytes = await buildTableDocx();
    const text = await extractDocxText(bytes);
    expect(text).toContain('Left column experience');
    expect(text).toContain('Right skills rail');
    // Order is document order — not positional multi-column detection.
    expect(text.indexOf('Left')).toBeLessThan(text.indexOf('Right'));
  });

  it('throws DocxCorruptError for non-docx bytes', async () => {
    await expect(extractDocxText(new Uint8Array([1, 2, 3, 4]))).rejects.toBeInstanceOf(
      DocxCorruptError,
    );
  });

  it('throws DocxEmptyError when the document has no text', async () => {
    const bytes = await buildMinimalDocx([]);
    await expect(extractDocxText(bytes)).rejects.toBeInstanceOf(DocxEmptyError);
  });
});

describe('normalizeDocxFileName', () => {
  it('strips duplicated .docx extensions', () => {
    expect(normalizeDocxFileName('resume.docx.docx')).toBe('resume.docx');
  });
});

describe('analyzeParseability (docx)', () => {
  it('discloses limited layout checks and skips multi-column penalties', () => {
    const rawText =
      'Priya Sharma\nExperience\nEducation\nSkills\n' +
      'Left column experience describing shipped products\n' +
      'Right skills rail TypeScript React Node\n' +
      'word '.repeat(80);

    const r = analyzeParseability({
      rawText,
      layout: null,
      sourceKind: 'docx',
    });

    expect(r.findings.some((f) => f.id === 'docx_layout_limited')).toBe(true);
    expect(r.findings.some((f) => f.id === 'multi_column')).toBe(false);
    // Text heuristics only — no silent layout score inflation disclosure gap.
    expect(r.score).toBeGreaterThanOrEqual(90);
  });

  it('still runs text heuristics (nonstandard headings) for docx', () => {
    const r = analyzeParseability({
      rawText: 'My Journey\nCareer Story\n' + 'word '.repeat(100),
      layout: null,
      sourceKind: 'docx',
    });
    expect(r.findings.some((f) => f.id === 'docx_layout_limited')).toBe(true);
    expect(r.findings.some((f) => f.id === 'nonstandard_headings')).toBe(true);
  });
});
