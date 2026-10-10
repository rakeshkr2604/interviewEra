import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { BrandHomeLink } from './BrandHomeLink';

describe('BrandHomeLink', () => {
  it('full navbar has no white plate / ring chrome in either theme branch', () => {
    const html = renderToStaticMarkup(
      createElement(BrandHomeLink, { variant: 'navbar', compact: false }),
    );
    expect(html).not.toContain('bg-white');
    expect(html).not.toContain('ring-1');
    expect(html).toContain('dark:hidden');
    expect(html).toContain('dark:inline-flex');
    expect(html).toContain('interviewera-monogram-nav');
    expect(html).toContain('interviewera-purple-mark');
    expect(html).toContain('Interview');
    expect(html).toContain('Era');
  });

  it('footer dark branch uses purple mark + CSS wordmark without a light plate', () => {
    const html = renderToStaticMarkup(createElement(BrandHomeLink, { variant: 'footer' }));
    expect(html).toContain('dark:inline-flex');
    expect(html).toContain('interviewera-purple-mark');
    expect(html).toContain('Interview');
  });
});
