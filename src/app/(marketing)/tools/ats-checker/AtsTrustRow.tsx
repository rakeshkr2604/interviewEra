/** Full-width trust strip — pill chips + soft pulse; LTR marquee; static when reduced-motion. */

import type { CSSProperties } from 'react';

const ATS_TRUST_BULLETS = [
  {
    text: 'Resume processed for this check only',
    accent: 'var(--accent-success)',
  },
  {
    text: 'File discarded after analysis',
    accent: 'var(--accent-primary)',
  },
  {
    text: 'Explainable scores — not one fake “ATS %”',
    accent: 'var(--accent-success)',
  },
] as const;

function TrustBulletList({ ariaHidden }: { ariaHidden?: boolean }) {
  return (
    <ul
      className="ats-trust-track flex shrink-0 items-center gap-3 whitespace-nowrap px-3 text-sm sm:gap-3.5 sm:px-4"
      aria-hidden={ariaHidden || undefined}
    >
      {ATS_TRUST_BULLETS.map(({ text, accent }) => (
        <li
          key={text}
          className="ats-trust-chip flex shrink-0 items-center gap-2 rounded-full border px-3.5 py-1.5 sm:px-4 sm:py-2"
          style={
            {
              color: 'var(--text-primary)',
              borderColor: `color-mix(in srgb, ${accent} 32%, var(--card-border))`,
              background: `color-mix(in srgb, ${accent} 9%, var(--card-bg))`,
              boxShadow: `0 0 0 1px color-mix(in srgb, ${accent} 8%, transparent), 0 4px 14px -6px color-mix(in srgb, ${accent} 28%, transparent)`,
              '--ats-trust-accent': accent,
            } as CSSProperties
          }
        >
          <span className="ats-trust-dot relative size-2 shrink-0 rounded-full" aria-hidden />
          <span className="leading-snug font-medium">{text}</span>
        </li>
      ))}
    </ul>
  );
}

export function AtsTrustRow() {
  return (
    <div className="ats-trust-marquee w-full overflow-hidden" aria-label="Why this tool is safe to try">
      <style>{`
        .ats-trust-marquee .ats-trust-rail {
          animation: ats-trust-ltr 32s linear infinite;
        }
        .ats-trust-marquee .ats-trust-dot {
          background: var(--ats-trust-accent);
          box-shadow: 0 0 0 0 color-mix(in srgb, var(--ats-trust-accent) 55%, transparent);
          animation: ats-trust-pulse 2.4s ease-in-out infinite;
        }
        .ats-trust-marquee .ats-trust-chip {
          animation: ats-trust-chip-glow 3.2s ease-in-out infinite;
        }
        .ats-trust-marquee .ats-trust-chip:nth-child(1),
        .ats-trust-marquee .ats-trust-chip:nth-child(1) .ats-trust-dot { animation-delay: 0s; }
        .ats-trust-marquee .ats-trust-chip:nth-child(2),
        .ats-trust-marquee .ats-trust-chip:nth-child(2) .ats-trust-dot { animation-delay: 0.55s; }
        .ats-trust-marquee .ats-trust-chip:nth-child(3),
        .ats-trust-marquee .ats-trust-chip:nth-child(3) .ats-trust-dot { animation-delay: 1.1s; }
        @keyframes ats-trust-ltr {
          from { transform: translateX(-50%); }
          to { transform: translateX(0); }
        }
        @keyframes ats-trust-pulse {
          0%, 100% {
            transform: scale(1);
            box-shadow: 0 0 0 0 color-mix(in srgb, var(--ats-trust-accent) 50%, transparent);
          }
          50% {
            transform: scale(1.15);
            box-shadow: 0 0 0 6px color-mix(in srgb, var(--ats-trust-accent) 0%, transparent);
          }
        }
        @keyframes ats-trust-chip-glow {
          0%, 100% {
            filter: brightness(1);
          }
          50% {
            filter: brightness(1.04);
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ats-trust-marquee .ats-trust-rail,
          .ats-trust-marquee .ats-trust-dot,
          .ats-trust-marquee .ats-trust-chip {
            animation: none !important;
            filter: none !important;
            transform: none !important;
            box-shadow: none !important;
          }
          .ats-trust-marquee .ats-trust-rail {
            width: 100%;
            justify-content: center;
            flex-wrap: wrap;
            row-gap: 0.75rem;
          }
          .ats-trust-marquee .ats-trust-track:last-child {
            display: none;
          }
          .ats-trust-marquee .ats-trust-track {
            flex-wrap: wrap;
            justify-content: center;
            white-space: normal;
            padding-inline: 0;
            row-gap: 0.5rem;
          }
          .ats-trust-marquee .ats-trust-dot {
            background: var(--ats-trust-accent);
          }
        }
      `}</style>

      <ul className="sr-only">
        {ATS_TRUST_BULLETS.map(({ text }) => (
          <li key={text}>{text}</li>
        ))}
      </ul>

      <div className="ats-trust-viewport relative">
        <div className="ats-trust-rail flex w-max">
          <TrustBulletList ariaHidden />
          <TrustBulletList ariaHidden />
        </div>
      </div>
    </div>
  );
}
