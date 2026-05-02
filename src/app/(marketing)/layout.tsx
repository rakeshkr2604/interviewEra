import type { ReactNode } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/session';
import { MarketingHeader } from '@/components/layout/MarketingHeader';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

interface MarketingLayoutProps {
  children: ReactNode;
}

export default async function MarketingLayout({
  children,
}: MarketingLayoutProps) {
  const user = await getServerUser(await createClient());

  return (
    <div
      className="ie-landing-premium flex min-h-screen flex-col"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <MarketingHeader user={user} />

      <div className="flex-1">{children}</div>

      <footer
        className="border-t px-4 py-12 backdrop-blur-sm sm:px-5"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 55%, transparent)',
        }}
      >
        <div className={cn(LANDING_PAGE_CONTAINER, 'grid gap-10 md:grid-cols-12 md:gap-8')}>
          <div className="md:col-span-4">
            <p className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              InterviewEra
            </p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              A structured practice system to raise placement odds — resume-aware interviews, STAR coaching, and
              rubric-based scores built for Indian campus hiring.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 md:col-span-8 md:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Product
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/signup" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    Sign up
                  </Link>
                </li>
                <li>
                  <Link href="/campus" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    For colleges
                  </Link>
                </li>
                <li>
                  <Link href="/tools/question-generator" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    Free tools
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Learn
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <Link href="/blog" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="/about" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    About
                  </Link>
                </li>
              </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                Legal & contact
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                <li>
                  <a href="mailto:hello@interviewera.com" className="transition-opacity hover:opacity-80" style={{ color: 'var(--text-secondary)' }}>
                    hello@interviewera.com
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div
          className={cn(
            LANDING_PAGE_CONTAINER,
            'mt-10 border-t pt-8 text-center text-xs sm:flex sm:items-center sm:justify-between sm:text-left',
          )}
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}
        >
          <p>© 2026 InterviewEra. All rights reserved.</p>
          <p className="mt-2 sm:mt-0">Built for placement season in India.</p>
        </div>
      </footer>
    </div>
  );
}
