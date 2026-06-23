'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS } from '@/lib/analytics/cta-keys';
import { ChevronDown, Menu } from 'lucide-react';
import type { User } from '@supabase/supabase-js';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
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
import { NAV_TOOLS_LINKS } from '@/lib/seo/content/nav';
import { cn } from '@/lib/utils';

type DropdownKey = 'tools' | 'questions' | 'resources';

const NAV_DROPDOWNS = [
  {
    key: 'tools' as DropdownKey,
    label: 'Tools',
    items: [...NAV_TOOLS_LINKS],
  },
  {
    key: 'questions' as DropdownKey,
    label: 'Interview Questions',
    items: [
      { href: '/interview-questions', label: 'By Role' },
      { href: '/interview-questions/tcs', label: 'TCS Hub' },
      { href: '/interview-questions/companies/wipro', label: 'Wipro Hub' },
      { href: '/interview-questions/solera', label: 'Solera Hub' },
      { href: '/interview-questions/topics/react', label: 'By Topic' },
    ],
  },
  {
    key: 'resources' as DropdownKey,
    label: 'Resources',
    items: [
      { href: '/blog', label: 'Blog' },
      { href: '/help', label: 'Help Center' },
      { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Interview Guides' },
    ],
  },
] as const;

const LINK_STYLE = {
  color: 'var(--text-secondary)',
} as const;

export function MarketingHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [openDropdown, setOpenDropdown] = useState<DropdownKey | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<DropdownKey | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const work = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();
        void supabase.auth.getUser().then(async ({ data, error }) => {
          if (error) {
            const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
            await signOutIfStaleAuth(supabase, error);
            if (!cancelled) setUser(null);
          } else if (!cancelled) {
            setUser(data.user ?? null);
          }
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
      ? w.requestIdleCallback(() => void work(), { timeout: 3200 })
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

  function closeDropdown() {
    setOpenDropdown(null);
  }

  function toggleDropdown(key: DropdownKey) {
    setOpenDropdown((prev) => (prev === key ? null : key));
  }

  const ctaStyle = {
    background: 'var(--accent-primary)',
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
  } as const;

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
          'flex items-center gap-4 px-4 py-3 sm:px-5',
        )}
      >
        <BrandHomeLink variant="navbar" className="shrink-0" />

        {/* ── Desktop nav ─────────────────────────────────────────────── */}
        <div className="hidden items-center md:flex" style={LINK_STYLE}>
          {/* Product — simple link */}
          <Link
            href="/"
            className="whitespace-nowrap px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={LINK_STYLE}
          >
            Product
          </Link>

          {/* Dropdown groups */}
          {NAV_DROPDOWNS.map((dropdown) => (
            <div
              key={dropdown.key}
              className="relative"
              onMouseEnter={() => setOpenDropdown(dropdown.key)}
              onMouseLeave={closeDropdown}
              onBlur={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node)) closeDropdown();
              }}
            >
              <button
                type="button"
                aria-expanded={openDropdown === dropdown.key}
                aria-haspopup="menu"
                className="flex cursor-pointer items-center gap-1 whitespace-nowrap px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
                style={LINK_STYLE}
                onClick={() => toggleDropdown(dropdown.key)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') closeDropdown();
                }}
              >
                {dropdown.label}
                <ChevronDown
                  className={cn(
                    'size-3.5 transition-transform duration-150',
                    openDropdown === dropdown.key && 'rotate-180',
                  )}
                />
              </button>

              {openDropdown === dropdown.key && (
                <div
                  role="menu"
                  className="absolute left-0 top-full z-50 mt-0.5 min-w-[200px] rounded-xl border py-1.5 shadow-lg"
                  style={{
                    background: 'var(--card-bg)',
                    borderColor: 'var(--card-border)',
                  }}
                >
                  {dropdown.items.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      role="menuitem"
                      className="block px-4 py-2 text-sm transition-colors hover:opacity-80"
                      style={LINK_STYLE}
                      onClick={closeDropdown}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          ))}

          {/* Pricing — simple link */}
          <Link
            href="/pricing"
            className="whitespace-nowrap px-3 py-2 text-sm font-medium transition-opacity hover:opacity-80"
            style={LINK_STYLE}
          >
            Pricing
          </Link>
        </div>

        {/* ── Right side ──────────────────────────────────────────────── */}
        <div className="ml-auto flex items-center gap-1.5 sm:gap-2.5">
          <ThemeToggle />

          {/* Desktop auth */}
          <div className="hidden min-h-9 items-center justify-end gap-2.5 md:flex md:min-w-[220px]">
            {user ? (
              <Link
                href="/dashboard"
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                style={ctaStyle}
              >
                Dashboard
              </Link>
            ) : (
              <div className="flex items-center gap-2.5">
                <Link
                  href="/login"
                  className="text-sm font-medium transition-opacity hover:opacity-80"
                  style={LINK_STYLE}
                >
                  Login
                </Link>
                <TrackedCtaLink
                  href="/signup"
                  ctaKey={CTA_KEYS.SIGN_UP}
                  ctaText="Sign up free"
                  section="header"
                  authenticated={false}
                  className="rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
                  style={ctaStyle}
                >
                  Sign up free
                </TrackedCtaLink>
              </div>
            )}
          </div>

          {/* ── Mobile menu ─────────────────────────────────────────── */}
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
                  <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                  <BrandHomeLink variant="navbar" compact wordmarkClassName="text-base" />
                </SheetHeader>

                <nav className="flex flex-col p-2">
                  {/* Product */}
                  <Link
                    href="/"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-base font-medium text-foreground transition-colors active:bg-accent"
                  >
                    Product
                  </Link>

                  {/* Dropdown groups */}
                  {NAV_DROPDOWNS.map((dropdown) => (
                    <div key={dropdown.key}>
                      <button
                        type="button"
                        className="flex w-full items-center justify-between rounded-xl px-4 py-3.5 text-base font-medium text-foreground transition-colors active:bg-accent"
                        aria-expanded={mobileExpanded === dropdown.key}
                        onClick={() =>
                          setMobileExpanded((prev) =>
                            prev === dropdown.key ? null : dropdown.key,
                          )
                        }
                      >
                        {dropdown.label}
                        <ChevronDown
                          className={cn(
                            'size-4 shrink-0 transition-transform duration-150',
                            mobileExpanded === dropdown.key && 'rotate-180',
                          )}
                        />
                      </button>

                      {mobileExpanded === dropdown.key && (
                        <div className="ml-3 border-l border-border pl-3 pb-1">
                          {dropdown.items.map((item) => (
                            <Link
                              key={item.href}
                              href={item.href}
                              onClick={() => {
                                setMobileOpen(false);
                                setMobileExpanded(null);
                              }}
                              className="block rounded-lg px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors active:bg-accent"
                            >
                              {item.label}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Pricing */}
                  <Link
                    href="/pricing"
                    onClick={() => setMobileOpen(false)}
                    className="rounded-xl px-4 py-3.5 text-base font-medium text-foreground transition-colors active:bg-accent"
                  >
                    Pricing
                  </Link>

                  <div className="mx-2 my-2 border-t border-border" aria-hidden />

                  {/* Auth */}
                  {user ? (
                    <Link
                      href="/dashboard"
                      onClick={() => setMobileOpen(false)}
                      className="mx-2 rounded-xl px-4 py-3.5 text-center text-base font-semibold text-white"
                      style={ctaStyle}
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
                      <TrackedCtaLink
                        href="/signup"
                        ctaKey={CTA_KEYS.SIGN_UP}
                        ctaText="Sign up free"
                        section="header_mobile"
                        authenticated={false}
                        onClick={() => setMobileOpen(false)}
                        className="mx-2 mt-1 rounded-xl px-4 py-3.5 text-center text-base font-semibold text-white"
                        style={ctaStyle}
                      >
                        Sign up free
                      </TrackedCtaLink>
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
