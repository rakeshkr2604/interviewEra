import { describe, expect, it } from 'vitest';
import { privacyDocument, COMPANY_ADDRESS, GRIEVANCE_OFFICER } from './privacy-content';
import { termsDocument } from './terms-content';
import { refundDocument } from './refund-content';

function flattenLegalText(doc: {
  intro?: string;
  highlights?: ReadonlyArray<{ label: string; value: string }>;
  sections: ReadonlyArray<{
    text?: string;
    intro?: string;
    bullets?: readonly string[];
    footer?: string;
    content?: ReadonlyArray<{ text?: string; sub?: string }>;
    callout?: { title?: string; body?: string };
    contact?: { email?: string; address?: string };
  }>;
}): string {
  const parts: string[] = [];
  if (doc.intro) parts.push(doc.intro);
  for (const h of doc.highlights ?? []) {
    parts.push(h.label, h.value);
  }
  for (const section of doc.sections) {
    if (section.text) parts.push(section.text);
    if (section.intro) parts.push(section.intro);
    if (section.footer) parts.push(section.footer);
    if (section.callout?.title) parts.push(section.callout.title);
    if (section.callout?.body) parts.push(section.callout.body);
    for (const bullet of section.bullets ?? []) parts.push(bullet);
    for (const block of section.content ?? []) {
      if (block.sub) parts.push(block.sub);
      if (block.text) parts.push(block.text);
    }
    if (section.contact?.email) parts.push(section.contact.email);
    if (section.contact?.address) parts.push(section.contact.address);
  }
  return parts.join('\n');
}

describe('legal content consistency (launch readiness)', () => {
  const privacyText = flattenLegalText(privacyDocument);
  const termsText = flattenLegalText(termsDocument);
  const refundText = flattenLegalText(refundDocument);
  const all = [privacyText, termsText, refundText].join('\n');

  it('does not invent GSTIN, CIN, or private-limited registration claims', () => {
    expect(all).not.toMatch(/\bGSTIN\b/i);
    expect(all).not.toMatch(/\bCIN\b/);
    expect(all).not.toMatch(/private limited|llp\b|proprietorship/i);
    expect(all).not.toMatch(/InterviewEra \(India\)/);
  });

  it('does not claim GST is included in plan prices', () => {
    expect(all.toLowerCase()).not.toMatch(/include[sd]? applicable gst|includes applicable gst/);
  });

  it('keeps correspondence address and grievance officer consistent', () => {
    expect(COMPANY_ADDRESS.length).toBeGreaterThan(10);
    expect(privacyText).toContain(COMPANY_ADDRESS);
    expect(privacyText).toMatch(/Correspondence address/i);
    expect(privacyText).not.toMatch(/Registered \/ operating address/i);
    expect(privacyText).toContain(GRIEVANCE_OFFICER.email);
    expect(termsText).toContain(COMPANY_ADDRESS);
    expect(refundText).toContain(COMPANY_ADDRESS);
  });

  it('avoids an exclusive Bengaluru venue claim until entity is confirmed', () => {
    expect(termsText).not.toMatch(/exclusive jurisdiction of the courts in Bengaluru/i);
    expect(termsDocument.highlights.find((h) => h.label === 'Governing law')?.value).toBe(
      'Laws of India',
    );
  });
});
