import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandTagline } from './BrandTagline';

describe('BrandTagline', () => {
  it('uses theme text token (not hardcoded deep navy) and exposes readable parts', () => {
    const html = renderToStaticMarkup(createElement(BrandTagline));
    expect(html).toContain('var(--text-primary)');
    expect(html).not.toContain('#09062D');
    expect(html).not.toContain('#09062d');
    expect(html).toContain('PROGRESS');
    expect(html).not.toContain('aria-label=');
    expect(html).toContain('aria-hidden');
  });
});
