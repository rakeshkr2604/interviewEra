'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  CreditCard,
  FileText,
  GraduationCap,
  HelpCircle,
  Mic,
  Rocket,
  Search,
  UserCircle,
  Wrench,
} from 'lucide-react';
import { TECHNICAL_ISSUE_FEEDBACK_HREF } from '@/lib/technical-failures/ux';

type Category = {
  icon: React.ComponentType<{ className?: string }>;
  name: string;
  desc: string;
  href: string | null;
  meta: string;
};

/**
 * Help Center categories. Cards with a `href` deep-link to existing, real content;
 * cards without one render a graceful "expanding soon" state (no fake articles).
 */
const CATEGORIES: Category[] = [
  { icon: Rocket, name: 'Getting Started', desc: 'Create your account and run your first scored mock interview.', href: '/how-it-works', meta: 'Guide' },
  { icon: Mic, name: 'Interview Sessions', desc: 'How adaptive questions, follow-ups, and live captions work.', href: '/how-it-works', meta: 'Guide' },
  { icon: FileText, name: 'Resume & ATS', desc: 'Upload your resume and check ATS compatibility for a role.', href: '/tools/ats-checker', meta: 'Tool' },
  { icon: BarChart3, name: 'Scoring & Feedback', desc: 'Understand the five-dimension rubric and your report.', href: '/help#scoring', meta: 'FAQ' },
  { icon: CreditCard, name: 'Billing & Credits', desc: 'Credits, plans, payments, and refunds.', href: '/help#credits-plans', meta: 'FAQ' },
  { icon: UserCircle, name: 'Account & Login', desc: 'Sign-in, profile, and account settings.', href: null, meta: 'Expanding soon' },
  { icon: Wrench, name: 'Technical Issues', desc: 'Audio, microphone, browser, and session troubleshooting.', href: TECHNICAL_ISSUE_FEEDBACK_HREF, meta: 'Report' },
  { icon: GraduationCap, name: 'Placement Practice', desc: 'Role- and company-specific interview question sets.', href: '/interview-questions', meta: 'Library' },
  { icon: HelpCircle, name: 'FAQ', desc: 'Quick answers to the most common questions.', href: '/help', meta: 'FAQ' },
];

export function HelpCenterSearch() {
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return CATEGORIES;
    return CATEGORIES.filter(
      (c) => c.name.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q),
    );
  }, [query]);

  return (
    <>
      {/* Search */}
      <div className="mx-auto mt-8 max-w-xl">
        <div
          className="flex items-center gap-3 rounded-2xl border-2 px-4 py-3.5 transition-colors focus-within:border-(--accent-primary)"
          style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}
        >
          <Search className="size-5 shrink-0" style={{ color: 'var(--text-muted)' }} aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help topics…"
            aria-label="Search help topics"
            className="w-full bg-transparent text-sm outline-none placeholder:text-(--text-muted)"
            style={{ color: 'var(--text-primary)' }}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="mx-auto mt-12 grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map(({ icon: Icon, name, desc, href, meta }) => {
          const inner = (
            <>
              <div className="flex items-center justify-between">
                <span
                  className="flex size-10 items-center justify-center rounded-xl"
                  style={{ background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)', color: 'var(--accent-primary)' }}
                >
                  <Icon className="size-5" />
                </span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                  style={{
                    background: href ? 'color-mix(in srgb, var(--accent-primary) 10%, transparent)' : 'color-mix(in srgb, var(--text-muted) 12%, transparent)',
                    color: href ? 'var(--accent-hover)' : 'var(--text-muted)',
                  }}
                >
                  {meta}
                </span>
              </div>
              <h3 className="mt-4 text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                {name}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {desc}
              </p>
              {href ? (
                <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent-primary)' }}>
                  Open <ArrowRight className="size-3.5" aria-hidden />
                </span>
              ) : (
                <span className="mt-3 inline-block text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
                  Documentation expanding soon
                </span>
              )}
            </>
          );

          const cardStyle = {
            borderColor: 'var(--card-border)',
            background: 'color-mix(in srgb, var(--card-bg) 78%, transparent)',
          } as const;

          return href ? (
            <Link
              key={name}
              href={href}
              className="rounded-2xl border-2 p-5 transition-colors hover:border-(--accent-primary)"
              style={cardStyle}
            >
              {inner}
            </Link>
          ) : (
            <div key={name} className="rounded-2xl border-2 p-5 opacity-75" style={cardStyle} aria-disabled="true">
              {inner}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <p className="mt-10 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          No topics match &ldquo;{query}&rdquo;. Try a different term, or{' '}
          <Link href="/contact" className="font-semibold underline-offset-2 hover:underline" style={{ color: 'var(--accent-primary)' }}>
            contact support
          </Link>
          .
        </p>
      )}
    </>
  );
}
