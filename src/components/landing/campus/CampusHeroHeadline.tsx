import { HERO } from '@/lib/landing/campus-content';
import { cn } from '@/lib/utils';

/**
 * Campus hero H1:
 *   Make your placement batch
 *   interview-ready.
 *
 * Static (no rotation) so the value proposition reads in one pass for T&P visitors.
 * Intentional line blocks — avoids word-by-word wrapping that looks broken.
 */
export function CampusHeroHeadline({ className }: { className?: string }) {
  return (
    <h1
      className={cn(
        'w-full max-w-[22rem] font-extrabold tracking-tight sm:max-w-[30rem] lg:max-w-none',
        'text-center text-[1.875rem] leading-[1.15] sm:text-[2.75rem] sm:leading-[1.12] md:text-[3.15rem] lg:text-left lg:text-[3.25rem]',
        className,
      )}
      style={{ color: 'var(--text-primary)' }}
    >
      <span className="block">{HERO.headlineLead}</span>
      <span
        className="block bg-clip-text text-transparent"
        style={{
          backgroundImage: 'linear-gradient(120deg, var(--accent-primary), var(--accent-hover))',
        }}
      >
        {HERO.headlineAccent}
      </span>
    </h1>
  );
}
