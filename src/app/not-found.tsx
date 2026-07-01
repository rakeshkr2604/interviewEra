import Link from 'next/link';
import { Home, RotateCcw, BookOpen } from 'lucide-react';
import {
  IE_FOCUS_VISIBLE,
  IE_MARKETING_CTA_PRIMARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_CLASS,
  IE_MARKETING_CTA_SECONDARY_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

export default function NotFound() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 text-center"
      style={{ background: 'var(--page-gradient, #f8fafc)' }}
    >
      {/* Decorative glow */}
      <div
        className="pointer-events-none absolute inset-0 overflow-hidden"
        aria-hidden
      >
        <div
          className="absolute left-1/2 top-1/2 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: 'color-mix(in srgb, var(--accent-primary, #6366f1) 8%, transparent)' }}
        />
      </div>

      <div className="relative space-y-6">
        <p
          className="text-8xl font-black tabular-nums tracking-tight sm:text-9xl"
          style={{ color: 'color-mix(in srgb, var(--accent-primary, #6366f1) 20%, var(--bg-secondary, #e5e7eb))' }}
          aria-hidden
        >
          404
        </p>

        <div className="space-y-2">
          <h1
            className="text-2xl font-bold tracking-tight sm:text-3xl"
            style={{ color: 'var(--text-primary, #111827)' }}
          >
            Page not found
          </h1>
          <p
            className="mx-auto max-w-sm text-sm leading-relaxed sm:text-base"
            style={{ color: 'var(--text-secondary, #6b7280)' }}
          >
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3 pt-2 sm:flex-row sm:justify-center">
          <Link
            href="/dashboard"
            className={cn(
              IE_MARKETING_CTA_PRIMARY_CLASS,
              'rounded-[var(--ie-radius-md)] px-6 py-2.5',
            )}
            style={{
              background: 'var(--accent-primary)',
              boxShadow: '0 10px 28px color-mix(in srgb, var(--accent-primary) 32%, transparent)',
            }}
          >
            <Home className="h-4 w-4" aria-hidden />
            Go to Dashboard
          </Link>
          <Link
            href="/"
            className={cn(
              IE_MARKETING_CTA_SECONDARY_CLASS,
              'rounded-[var(--ie-radius-md)] border-2 px-6 py-2.5',
            )}
            style={{
              ...IE_MARKETING_CTA_SECONDARY_STYLE,
              background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <RotateCcw className="h-4 w-4" aria-hidden />
            Back to Home
          </Link>
        </div>

        <div
          className="border-t-2 pt-6"
          style={{ borderColor: 'var(--card-border, #e5e7eb)' }}
        >
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-muted, #9ca3af)' }}>
            You might be looking for
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {[
              { href: '/interview/new', label: 'Start Interview' },
              { href: '/history', label: 'Interview History' },
              { href: '/analytics', label: 'Analytics' },
              { href: '/pricing', label: 'Pricing' },
              { href: '/blog', label: 'Blog' },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-opacity hover:opacity-70',
                  IE_FOCUS_VISIBLE,
                )}
                style={{
                  borderColor: 'var(--card-border, #e5e7eb)',
                  color: 'var(--text-secondary, #6b7280)',
                  background: 'color-mix(in srgb, var(--card-bg, #fff) 60%, transparent)',
                }}
              >
                <BookOpen className="h-3 w-3" aria-hidden />
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
