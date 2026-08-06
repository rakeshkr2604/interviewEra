'use client';

import { useEffect, useRef } from 'react';

/**
 * Thin top reading progress bar for long-form blog posts.
 * Uses rAF-coalesced scroll updates + compositor-friendly scaleX (no width layout thrash).
 */
export function AiMockBlogReadingProgress() {
  const barRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const lastPctRef = useRef(-1);

  useEffect(() => {
    const apply = () => {
      rafRef.current = 0;
      const { documentElement } = document;
      const scrollable = documentElement.scrollHeight - documentElement.clientHeight;
      const next =
        scrollable <= 0
          ? 0
          : Math.min(100, Math.max(0, (documentElement.scrollTop / scrollable) * 100));

      // Skip sub-pixel churn — avoids React paint storms while scrolling.
      if (Math.abs(next - lastPctRef.current) < 0.35) return;
      lastPctRef.current = next;

      const el = barRef.current;
      if (el) {
        el.style.transform = `scaleX(${next / 100})`;
      }
    };

    const onScrollOrResize = () => {
      if (rafRef.current) return;
      rafRef.current = window.requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener('scroll', onScrollOrResize, { passive: true });
    window.addEventListener('resize', onScrollOrResize, { passive: true });
    return () => {
      if (rafRef.current) window.cancelAnimationFrame(rafRef.current);
      window.removeEventListener('scroll', onScrollOrResize);
      window.removeEventListener('resize', onScrollOrResize);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px] w-full sm:h-1"
      aria-hidden
    >
      <div
        ref={barRef}
        className="ie-blog-reading-progress-bar h-full w-full origin-left rounded-none bg-gradient-to-r from-[#6C47FF] via-[#7c5cff] to-[#a78bfa] will-change-transform"
        style={{ transform: 'scaleX(0)' }}
      />
    </div>
  );
}
