import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandTagline } from './BrandTagline';

describe('BrandTagline', () => {
  it('uses theme text token on chrome surface (not hardcoded deep navy)', () => {
    const html = renderToStaticMarkup(createElement(BrandTagline));
    expect(html).toContain('var(--text-primary)');
    expect(html).not.toContain('#09062D');
    expect(html).not.toContain('#09062d');
    expect(html).toContain('PROGRESS');
    expect(html).not.toContain('aria-label=');
    expect(html).toContain('aria-hidden');
  });

  it('uses deep navy on light-plate surface for white lockup contrast', () => {
    const html = renderToStaticMarkup(
      createElement(BrandTagline, { surface: 'light-plate' }),
    );
    expect(html).toContain('#09062D');
    expect(html).not.toContain('var(--text-primary)');
  });
});
