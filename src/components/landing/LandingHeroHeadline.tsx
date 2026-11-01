/**
 * Homepage hero H1 (left column) — Server Component (no hydration on the LCP text).
 *   Turn your resume into interview-ready practice.
 *   [CSS-animated rotating accent]
 *
 * Rotation is decorative; the first phrase is also in `.sr-only` for a11y/SEO.
 * Height is reserved from the longest phrase so rotation never shifts the CTA.
 */

export const LANDING_HERO_ROTATING_PHRASES = [
  'Designed for real interviews.',
  'Ready for placement season.',
  'Made for early-career candidates.',
  'Built around your resume.',
] as const;

const LONGEST_PHRASE = LANDING_HERO_ROTATING_PHRASES.reduce((a, b) =>
  a.length >= b.length ? a : b,
);

export default function LandingHeroHeadline() {
  return (
    <h1
      id="landing-hero-heading"
      className="hero-copy-heading mb-3.5 text-pretty sm:mb-5"
      style={{
        fontFamily: 'var(--font-bricolage), sans-serif',
        fontWeight: 800,
        letterSpacing: '-0.03em',
        color: 'var(--text-primary)',
      }}
    >
      <span className="hero-copy-heading__lead block">Turn your resume into interview-ready practice.</span>
      {/* Stable accessible / indexable name; rotation is decorative */}
      <span className="sr-only">{LANDING_HERO_ROTATING_PHRASES[0]}</span>
      <span className="ie-lh-hero-rotate hero-copy-heading__accent" aria-hidden>
        <span className="ie-lh-hero-rotate__sizer">{LONGEST_PHRASE}</span>
        {LANDING_HERO_ROTATING_PHRASES.map((phrase, i) => (
          <span
            key={phrase}
            className="ie-lh-hero-rotate__item v3-hero-gradient-text"
            style={{ animationDelay: `${i * 2.8}s` }}
            data-first={i === 0 ? 'true' : undefined}
          >
            {phrase}
          </span>
        ))}
      </span>
    </h1>
  );
}
