'use client';

import { useEffect, useState } from 'react';

/**
 * Thin top reading progress bar for long-form blog posts (viewport scroll).
 */
export function AiMockBlogReadingProgress() {
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const read = () => {
      const { documentElement } = document;
      const scrollable = documentElement.scrollHeight - documentElement.clientHeight;
      if (scrollable <= 0) {
        setPct(0);
        return;
      }
      setPct(Math.min(100, Math.max(0, (documentElement.scrollTop / scrollable) * 100)));
    };

    read();
    window.addEventListener('scroll', read, { passive: true });
    window.addEventListener('resize', read, { passive: true });
    return () => {
      window.removeEventListener('scroll', read);
      window.removeEventListener('resize', read);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-[70] h-[3px] w-full sm:h-1"
      aria-hidden
    >
      <div
        className="h-full rounded-none bg-gradient-to-r from-[#6C47FF] via-[#7c5cff] to-[#a78bfa] shadow-sm transition-[width] duration-150 ease-out"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
