'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { cn } from '@/lib/utils';

const NAV_LINKS = [
  { href: '/campus', label: 'For Colleges' },
  { href: '/tools/question-generator', label: 'Free tools' },
  { href: '/blog', label: 'Blog' },
  { href: '/about', label: 'About' },
] as const;

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    /** Defer @supabase/ssr off the marketing-header initial chunk. */
    const work = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();
        void supabase.auth.getUser().then(({ data }) => {
          if (!cancelled) setUser(data.user ?? null);
        });
        const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!cancelled) setUser(session?.user ?? null);
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        /* navigation still works without auth state */
      }
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    const handle: number | ReturnType<typeof setTimeout> = w.requestIdleCallback
      ? w.requestIdleCallback(() => void work(), { timeout: 1500 })
      : setTimeout(() => void work(), 0);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (typeof handle === 'number') {
        w.cancelIdleCallback?.(handle);
      } else {
        clearTimeout(handle);
      }
    };
  }, []);

  return (
    <header
      className="sticky top-0 z-50 border-b backdrop-blur-md"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
      }}
    >
      <nav
        className={cn(
          LANDING_PAGE_CONTAINER,
          'flex items-center gap-6 px-4 py-3 sm:gap-8 sm:px-5',
        )}
      >
        <Link
          href="/"
          className="shrink-0 text-base font-bold tracking-tight sm:text-lg"
          style={{ color: 'var(--text-primary)' }}
        >
          InterviewEra
        </Link>

        <div
          className="hidden items-center gap-5 md:flex"
          style={{ color: 'var(--text-secondary)' }}
        >
          {NAV_LINKS.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="text-sm font-medium transition-opacity hover:opacity-80"
              style={{ color: 'var(--text-secondary)' }}
            >
              {label}
            </Link>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <ThemeToggle />
          {user ? (
            <Link
              href="/dashboard"
              className="hidden rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 md:inline-flex"
              style={{ background: 'var(--accent-primary)' }}
            >
              Dashboard
            </Link>
          ) : (
            <div className="hidden items-center gap-3 md:flex">
              <Link
                href="/login"
                className="text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: 'var(--text-secondary)' }}
              >
                Login
              </Link>
              <Link
                href="/signup"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent-primary)' }}
              >
                Sign up free
              </Link>
            </div>
          )}
          <div className="flex md:hidden">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-9 shrink-0"
                    aria-label="Open menu"
                    style={{ color: 'var(--text-primary)' }}
                  />
                }
              >
                <Menu className="size-5" />
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-[min(100%,20rem)] gap-0 border-l border-border p-0 sm:max-w-sm"
              >
                <SheetHeader className="border-b border-border px-4 py-4 text-left">
                  <SheetTitle className="text-foreground">Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col p-2">
                  {NAV_LINKS.map(({ href, label }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'rounded-xl px-4 py-3.5 text-base font-medium text-foreground transition-colors',
                        'active:bg-accent',
                      )}
                    >
                      {label}
                    </Link>
                  ))}
                  <div className="mx-2 my-2 border-t border-border" aria-hidden />
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="mx-2 rounded-xl px-4 py-3.5 text-center text-base font-semibold text-white"
                      style={{ background: 'var(--accent-primary)' }}
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileOpen(false)}
                        className="rounded-xl px-4 py-3.5 text-base font-medium text-muted-foreground"
                      >
                        Login
                      </Link>
                      <Link
                        href="/signup"
                        onClick={() => setMobileOpen(false)}
                        className="mx-2 mt-1 rounded-xl px-4 py-3.5 text-center text-base font-semibold text-white"
                        style={{ background: 'var(--accent-primary)' }}
                      >
                        Sign up free
                      </Link>
                    </>
                  )}
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </nav>
    </header>
  );
}
