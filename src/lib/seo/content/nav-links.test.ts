import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { NAV_TOOLS_ITEMS, NAV_TOOLS_LINKS } from './nav-links';

describe('nav-links isolation', () => {
  it('exports the static tool hrefs the marketing chrome needs', () => {
    expect(NAV_TOOLS_LINKS.map((item) => item.href)).toContain('/tools/ats-checker');
    expect(NAV_TOOLS_ITEMS).toHaveLength(3);
  });

  it('does not import the programmatic question bank', () => {
    const source = readFileSync('src/lib/seo/content/nav-links.ts', 'utf8');
    expect(source).not.toMatch(/content\/registry/);
    expect(source).not.toMatch(/programmatic\/questions/);
  });

  it('keeps client chrome off the question-bank module', () => {
    const navbar = readFileSync('src/components/layout/Navbar.tsx', 'utf8');
    const footer = readFileSync('src/components/layout/MarketingFooter.tsx', 'utf8');
    const slot = readFileSync('src/components/layout/NavbarSlot.tsx', 'utf8');
    expect(navbar).toMatch(/nav-links/);
    expect(navbar).not.toMatch(/seo\/content\/nav'/);
    expect(footer).toMatch(/nav-links/);
    expect(slot).toMatch(/next\/dynamic/);
  });
});
