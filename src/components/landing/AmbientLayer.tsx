import type { CSSProperties } from 'react';

/**
 * Ambient visual layers — pure-CSS atmospheric "imagery" rendered in code.
 *
 * These replace stock/AI photography: layered radial light fields (the Linear/Stripe
 * approach) that read as cinematic atmosphere without a single binary asset. Because
 * they're built from theme tokens + color-mix, they adapt to light/dark automatically,
 * never ship a white/black background, and cause zero layout shift.
 *
 * Always decorative: aria-hidden, pointer-events: none, absolutely positioned.
 * The host section must be `position: relative; overflow: hidden`, and its real
 * content must sit at z-index ≥ 1 so the glow stays behind the text.
 */

type AmbientVariant = 'hero' | 'before-after' | 'early-access';

const BASE: CSSProperties = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  zIndex: 0,
  overflow: 'hidden',
};

function glow(style: CSSProperties): CSSProperties {
  return { position: 'absolute', ...style };
}

export function AmbientLayer({ variant }: { variant: AmbientVariant }) {
  if (variant === 'hero') {
    // "Live session" screen-glow blooming out from behind the demo card (right side).
    return (
      <div aria-hidden style={BASE}>
        <div
          style={glow({
            top: '4%',
            right: '-8%',
            width: '56%',
            height: '92%',
            background:
              'radial-gradient(58% 55% at 62% 42%, color-mix(in srgb, var(--accent-primary) 16%, transparent), transparent 70%)',
          })}
        />
        <div
          style={glow({
            top: '18%',
            right: '2%',
            width: '36%',
            height: '64%',
            background:
              'radial-gradient(50% 50% at 50% 50%, color-mix(in srgb, var(--accent-hover) 11%, transparent), transparent 72%)',
          })}
        />
      </div>
    );
  }

  if (variant === 'before-after') {
    // Editorial split: muted/scattered on the left → clear accent clarity on the right.
    return (
      <div aria-hidden style={BASE}>
        <div
          style={glow({
            left: 0,
            top: 0,
            bottom: 0,
            width: '50%',
            background:
              'radial-gradient(70% 60% at 18% 50%, color-mix(in srgb, var(--text-muted) 7%, transparent), transparent 70%)',
          })}
        />
        <div
          style={glow({
            right: 0,
            top: 0,
            bottom: 0,
            width: '56%',
            background:
              'radial-gradient(64% 60% at 78% 46%, color-mix(in srgb, var(--accent-primary) 13%, transparent), transparent 72%)',
          })}
        />
      </div>
    );
  }

  // early-access — calm upward "dawn" glow rising from the bottom centre (progression).
  return (
    <div aria-hidden style={BASE}>
      <div
        style={glow({
          left: '50%',
          bottom: '-12%',
          transform: 'translateX(-50%)',
          width: '82%',
          height: '72%',
          background:
            'radial-gradient(50% 60% at 50% 100%, color-mix(in srgb, var(--accent-primary) 13%, transparent), transparent 70%)',
        })}
      />
      <div
        style={glow({
          left: '50%',
          bottom: 0,
          transform: 'translateX(-50%)',
          width: '52%',
          height: '46%',
          background:
            'radial-gradient(50% 60% at 50% 100%, color-mix(in srgb, var(--accent-hover) 11%, transparent), transparent 72%)',
        })}
      />
    </div>
  );
}
