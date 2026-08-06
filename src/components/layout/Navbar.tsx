'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { TrackedCtaLink } from '@/components/analytics/TrackedCta';
import { CTA_KEYS, type CtaKey } from '@/lib/analytics/cta-keys';
import { performClientLogout } from '@/lib/supabase/client-logout';
import { usePathname, useRouter } from 'next/navigation';
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  ChevronDown,
  Code2,
  CreditCard,
  GraduationCap,
  HelpCircle,
  Layers,
  LogOut,
  Menu,
  Mic2,
  Monitor,
  Play,
  Settings,
  Shield,
  Sparkles,
  TrendingUp,
  Users,
} from 'lucide-react';
import { BrandHomeLink } from '@/components/brand/BrandHomeLink';
import { CreditBadge } from '@/components/layout/CreditBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { UserAvatar } from '@/components/profile/UserAvatar';
import { getDefaultInterviewStartPath } from '@/lib/interview/default-interview-start-path';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { LANDING_PAGE_CONTAINER } from '@/lib/landing/container';
import { NAV_TOOLS_ITEMS, NAV_TOOLS_LINKS } from '@/lib/seo/content/nav';
import { cn } from '@/lib/utils';
import { isAnyNavPathActive, isNavPathActive } from '@/lib/navigation/nav-active';
import { IE_FOCUS_VISIBLE } from '@/lib/theme/component-classes';
import {
  NAV_DESKTOP_LINK_ACTIVE,
  NAV_DESKTOP_LINK_BASE,
  NAV_DROPDOWN_TRIGGER_BASE,
  NAV_MOBILE_LINK_ACTIVE,
  NAV_MOBILE_LINK_BASE,
  NAV_MOBILE_SECTION_LABEL,
  NAV_PRIMARY_CTA_CLASS,
  NAV_PRIMARY_CTA_STYLE,
  NAV_SHELL_HEIGHT_CLASS,
} from '@/lib/theme/nav-classes';
import {
  useMarketingNavbarAuth,
  type MarketingNavUser,
} from '@/hooks/use-marketing-navbar-auth';

// ─── Types ────────────────────────────────────────────────────────────────────

type NavUser = MarketingNavUser;

function NavbarPrimaryCta({
  href,
  ctaKey,
  ctaText,
  section,
  onClick,
  className,
  children,
}: {
  href: string;
  ctaKey: CtaKey;
  ctaText: string;
  section: string;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <TrackedCtaLink
      href={href}
      ctaKey={ctaKey}
      ctaText={ctaText}
      section={section}
      onClick={onClick}
      className={cn(NAV_PRIMARY_CTA_CLASS, className)}
      style={NAV_PRIMARY_CTA_STYLE}
    >
      {children}
    </TrackedCtaLink>
  );
}

// Only links to pages that exist. Add more as new pages ship.
const PRODUCT_ITEMS = [
  {
    icon: Sparkles,
    label: 'What is InterviewEra',
    href: '/interviewera',
    desc: 'The platform, founder, and mission',
  },
  {
    icon: Mic2,
    label: 'How It Works',
    href: '/how-it-works',
    desc: 'Adaptive interview, live captions, scoring',
  },
  {
    icon: TrendingUp,
    label: 'Resume-aware Scoring',
    href: '/about',
    desc: 'CV-native questions + 5-dimension feedback',
  },
] as const;

const INTERVIEW_QUESTIONS_ITEMS = [
  {
    icon: Code2,
    label: 'Software Engineer',
    href: '/interview-questions/software-engineer',
    desc: 'DSA, system design, OOP rounds',
  },
  {
    icon: Monitor,
    label: 'Frontend Developer',
    href: '/interview-questions/frontend-developer',
    desc: 'React, HTML/CSS, JavaScript interviews',
  },
  {
    icon: Building2,
    label: 'TCS Interview Questions',
    href: '/interview-questions/tcs',
    desc: 'NQT + technical + HR rounds',
  },
  {
    icon: Building2,
    label: 'Wipro Careers Hub',
    href: '/interview-questions/companies/wipro',
    desc: 'NLTH, WILP, Turbo hiring tracks',
  },
  {
    icon: Building2,
    label: 'Solera Careers Hub',
    href: '/interview-questions/solera',
    desc: 'Cognitive assessment + Java/SQL rounds',
  },
  {
    icon: Layers,
    label: 'React Interview Questions',
    href: '/interview-questions/topics/react',
    desc: 'Hooks, state, performance topics',
  },
] as const;

const TOOL_ICONS = [Sparkles, Shield, Award] as const;

const TOOLS_ITEMS = NAV_TOOLS_ITEMS.map((item, index) => ({
  icon: TOOL_ICONS[index],
  label: item.label,
  href: item.href,
  desc: item.desc,
})) as readonly DropItem[];

const RESOURCES_ITEMS = [
  {
    icon: Layers,
    label: 'All Resources',
    href: '/resources',
    desc: 'Central guide and hub directory',
  },
  {
    icon: BookOpen,
    label: 'Blog',
    href: '/blog',
    desc: 'Interview prep articles and guides',
  },
  {
    icon: Sparkles,
    label: 'Agentic AI Interview Guide',
    href: '/blog/agentic-ai-interview-round-2026',
    desc: 'AI-assisted coding interviews, rubrics, and prep',
  },
  {
    icon: GraduationCap,
    label: 'Placement Guide',
    href: '/blog/how-to-prepare-for-placement-interviews',
    desc: 'Step-by-step campus prep playbook',
  },
  {
    icon: Award,
    label: 'STAR Method Guide',
    href: '/blog/what-is-star-method-with-examples',
    desc: 'Master behavioral answers',
  },
  {
    icon: HelpCircle,
    label: 'Help Center',
    href: '/help-center',
    desc: 'Guides, FAQs, and support',
  },
  {
    icon: Code2,
    label: 'DSA Topic Map',
    href: '/blog/top-dsa-interview-questions',
    desc: 'Patterns, roadmap, and top 50 problems',
  },
  {
    icon: Code2,
    label: 'Software Engineer Guide',
    href: '/interview-questions/software-engineer',
    desc: 'SWE questions and prep hub',
  },
  {
    icon: Monitor,
    label: 'Android Guide',
    href: '/interview-questions/android-developer',
    desc: 'Kotlin, Compose, MVVM prep hub',
  },
  {
    icon: Monitor,
    label: 'Frontend Guide',
    href: '/interview-questions/frontend-developer',
    desc: 'React and JavaScript interviews',
  },
] as const;


// ─── Nav item data ─────────────────────────────────────────────────────────────

// Only links to pages that exist. Add more as new pages ship.

function NavbarSignInLink({
  onClick,
  className,
}: {
  onClick?: () => void;
  className?: string;
}) {
  return (
    <Link
      href="/login"
      onClick={onClick}
      className={cn(
        'group relative inline-flex items-center justify-center overflow-hidden rounded-full',
        'border border-[color-mix(in_srgb,var(--card-border)_80%,transparent)]',
        'bg-[color-mix(in_srgb,var(--card-bg)_40%,transparent)] backdrop-blur-sm',
        'px-4 py-2 text-sm font-semibold tracking-tight',
        'text-(--text-secondary) shadow-sm',
        'transition-[border-color,box-shadow,transform,color] duration-300 ease-out',
        'hover:-translate-y-0.5 hover:border-[color-mix(in_srgb,var(--accent-primary)_45%,transparent)]',
        'hover:text-[var(--accent-link)]',
        'hover:shadow-[0_0_0_1px_color-mix(in_srgb,var(--accent-primary)_30%,transparent),0_8px_28px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)]',
        IE_FOCUS_VISIBLE,
        'motion-reduce:transform-none motion-reduce:hover:translate-y-0',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0 rounded-full opacity-0 transition-opacity duration-300',
          'bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent-primary)_16%,transparent),color-mix(in_srgb,#a855f7_10%,transparent))]',
          'group-hover:opacity-100',
        )}
      />
      <span
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-y-0 -left-full w-1/2 skew-x-[-18deg]',
          'bg-[linear-gradient(90deg,transparent,color-mix(in_srgb,white_55%,transparent),transparent)]',
          'opacity-0 transition-[left,opacity] duration-700 ease-out',
          'group-hover:left-[130%] group-hover:opacity-90',
          'motion-reduce:transition-none motion-reduce:group-hover:left-[-100%] motion-reduce:group-hover:opacity-0',
        )}
      />
      <span className="relative z-10 flex items-center gap-1">
        <span
          className={cn(
            'transition-all duration-300',
            'group-hover:bg-[linear-gradient(135deg,var(--accent-primary),#a855f7)] group-hover:bg-clip-text group-hover:text-transparent',
          )}
        >
          Sign in
        </span>
        <ArrowRight
          className={cn(
            'size-3.5 shrink-0 text-[var(--accent-primary)]',
            'translate-x-[-2px] opacity-0 transition-all duration-300',
            'group-hover:translate-x-0.5 group-hover:opacity-100',
          )}
          aria-hidden
        />
      </span>
    </Link>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// ─── Shared shell (sticky + scroll-aware blur/shadow) ─────────────────────────

function NavShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // sync on mount in case page is already scrolled
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Defer backdrop-filter until the user has scrolled: blur on the sticky
  // header forces expensive paint/compositing during the LCP-critical window.
  // At scrollY≈0 use a near-opaque fill (no filter); once scrolled, restore
  // the translucent + blur glass look so settled appearance matches before.
  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-50 border-b transition-shadow duration-200 motion-reduce:transition-none',
        NAV_SHELL_HEIGHT_CLASS,
        scrolled && 'shadow-sm',
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: scrolled
          ? 'color-mix(in srgb, var(--bg-primary) 82%, transparent)'
          : 'color-mix(in srgb, var(--bg-primary) 96%, transparent)',
        ...(scrolled
          ? {
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
            }
          : {}),
      }}
    >
      {/* Skip-to-content for keyboard users */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-60 focus:rounded-lg focus:px-3 focus:py-1.5 focus:text-sm focus:font-medium focus:text-white"
        style={{ background: 'var(--accent-primary)' }}
      >
        Skip to content
      </a>

      <nav
        aria-label="Main navigation"
        className={cn(
          LANDING_PAGE_CONTAINER,
          'flex h-full items-center gap-1 px-4 sm:px-5',
        )}
      >
        {children}
      </nav>
    </header>
  );
}

// ─── Hover dropdown (anonymous nav) ──────────────────────────────────────────

interface DropItem {
  readonly icon: React.ComponentType<{ className?: string }>;
  readonly label: string;
  readonly href: string;
  readonly desc: string;
  readonly ctaKey?: CtaKey;
  readonly ctaSection?: string;
}

function NavHoverMenu({
  label,
  items,
  onNavigate,
  columns = 1,
  menuId,
}: {
  label: string;
  items: readonly DropItem[];
  onNavigate?: () => void;
  columns?: 1 | 2;
  menuId: string;
}) {
  const pathname = usePathname() ?? '';
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const isActive = isAnyNavPathActive(
    pathname,
    items.map((item) => item.href),
  );

  const show = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const menuItem = ({
    icon: Icon,
    label: itemLabel,
    href,
    desc,
    ctaKey,
    ctaSection,
  }: DropItem) => {
    const itemActive = isNavPathActive(pathname, href);
    const itemClassName = cn(
      'group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
      itemActive && 'bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
    );
    const inner = (
      <>
        <span
          className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-link)',
          }}
          aria-hidden
        >
          <Icon className="size-3.5" />
        </span>
        <span className="flex flex-col gap-0.5">
          <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
            {itemLabel}
          </span>
          <span className="text-xs leading-snug" style={{ color: 'var(--text-secondary)' }}>
            {desc}
          </span>
        </span>
      </>
    );
    const onNavigateClick = () => {
      setOpen(false);
      onNavigate?.();
    };

    // Campus landing is a heavy client island (motion/react) — do not
    // viewport-prefetch it from marketing chrome.
    const linkPrefetch = href === '/campus' ? false : undefined;

    if (ctaKey) {
      return (
        <TrackedCtaLink
          key={href + itemLabel}
          href={href}
          prefetch={linkPrefetch}
          role="menuitem"
          ctaKey={ctaKey}
          ctaText={itemLabel}
          section={ctaSection ?? 'navbar_dropdown'}
          onClick={onNavigateClick}
          className={itemClassName}
        >
          {inner}
        </TrackedCtaLink>
      );
    }

    return (
      <Link
        key={href + itemLabel}
        href={href}
        prefetch={linkPrefetch}
        role="menuitem"
        onClick={onNavigateClick}
        className={itemClassName}
      >
        {inner}
      </Link>
    );
  };

  const splitAt = columns === 2 ? Math.ceil(items.length / 2) : items.length;
  const leftItems = items.slice(0, splitAt);
  const rightItems = columns === 2 ? items.slice(splitAt) : [];

  return (
    <div
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      <button
        type="button"
        id={`${menuId}-trigger`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={`${menuId}-menu`}
        className={cn(
          NAV_DROPDOWN_TRIGGER_BASE,
          open || isActive
            ? 'bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] font-semibold text-(--accent-link)'
            : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
        )}
      >
        {label}
        <ChevronDown
          className={cn(
            'size-3.5 transition-transform duration-150 motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>

      <div
        id={`${menuId}-menu`}
        role="menu"
        aria-labelledby={`${menuId}-trigger`}
        className={cn(
          'absolute left-0 top-[calc(100%+6px)] z-50 rounded-xl border p-1.5 shadow-xl',
          columns === 2 ? 'flex min-w-[36rem] gap-0.5' : 'min-w-71',
          'transition-[opacity,transform] duration-150 ease-out motion-reduce:transition-none',
          open
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-1 motion-reduce:translate-y-0',
        )}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {columns === 2 ? (
          <>
            <div className="min-w-0 flex-1">{leftItems.map(menuItem)}</div>
            <div
              className="mx-0.5 w-px shrink-0 self-stretch"
              style={{ background: 'var(--card-border)' }}
              aria-hidden
            />
            <div className="min-w-0 flex-1">{rightItems.map(menuItem)}</div>
          </>
        ) : (
          items.map(menuItem)
        )}
      </div>
    </div>
  );
}

// ─── Marketing desktop / mobile links ─────────────────────────────────────────

function MarketingNavLink({
  href,
  children,
  exact = false,
  onClick,
  className,
}: {
  href: string;
  children: React.ReactNode;
  exact?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const pathname = usePathname() ?? '';
  const isActive = isNavPathActive(pathname, href, exact);

  return (
    <Link
      href={href}
      onClick={onClick}
      aria-current={isActive ? 'page' : undefined}
      className={cn(NAV_DESKTOP_LINK_BASE, isActive && NAV_DESKTOP_LINK_ACTIVE, className)}
    >
      {children}
    </Link>
  );
}

function MobileNavLink({
  href,
  label,
  onNavigate,
  exact = false,
}: {
  href: string;
  label: string;
  onNavigate: () => void;
  exact?: boolean;
}) {
  const pathname = usePathname() ?? '';
  const isActive = isNavPathActive(pathname, href, exact);

  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(NAV_MOBILE_LINK_BASE, isActive && NAV_MOBILE_LINK_ACTIVE)}
    >
      {label}
    </Link>
  );
}

// ─── Avatar dropdown ──────────────────────────────────────────────────────────

function AvatarMenu({
  user,
  isAdmin = false,
}: {
  user: NavUser;
  isAdmin?: boolean;
}) {
  const router = useRouter();

  const handleLogout = () => {
    void performClientLogout({ redirectTo: '/login' })
  }

  const showUpgrade = !isAdmin && (user.plan_tier === 'free' || user.plan_tier === 'starter');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none ring-2 ring-transparent transition-shadow hover:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] focus-visible:ring-(--accent-primary)"
      >
        <UserAvatar
          name={user.name}
          email={user.email}
          avatarPath={user.avatar_path}
          oauthPictureUrl={user.oauth_picture_url}
          size="sm"
          className="size-8 cursor-pointer"
        />
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        style={{ width: 'auto', minWidth: '228px' }}
      >
        {/* Identity */}
        <div className="px-3 py-2.5">
          <p className="text-sm font-semibold leading-tight" style={{ color: 'var(--text-primary)' }}>
            {user.name ?? 'You'}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
            {user.email}
          </p>
          {!isAdmin && (
            <span
              className="mt-1.5 inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-link)',
              }}
            >
              {user.plan_tier}
            </span>
          )}
        </div>
        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => router.push('/settings')}
          className="flex cursor-pointer items-center gap-2"
        >
          <Settings className="size-4" aria-hidden />
          Settings
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/settings/billing')}
          className="flex cursor-pointer items-center gap-2"
        >
          <CreditCard className="size-4" aria-hidden />
          Billing
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => router.push('/help-center')}
          className="flex cursor-pointer items-center gap-2"
        >
          <HelpCircle className="size-4" aria-hidden />
          Help Center
        </DropdownMenuItem>

        {showUpgrade && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/upgrade')}
              className="flex cursor-pointer items-center gap-2 font-medium"
              style={{ color: 'var(--accent-link)' }}
            >
              <TrendingUp className="size-4" aria-hidden />
              Upgrade to Pro
            </DropdownMenuItem>
          </>
        )}

        {isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push('/admin/bulk-invite')}
              className="flex cursor-pointer items-center gap-2"
            >
              <Users className="size-4" aria-hidden />
              Invite Students
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push('/dashboard')}
              className="flex cursor-pointer items-center gap-2"
            >
              <Shield className="size-4" aria-hidden />
              Switch to Student View
            </DropdownMenuItem>
          </>
        )}

        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void handleLogout()}
          className="flex cursor-pointer items-center gap-2"
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ─── Progressive auth placeholder (SSR + first paint until auth resolves) ─────
// Static skeleton only — no `animate-pulse`. Continuous opacity animation on the
// sticky header forced style work during the LCP window (hero copy). Keep bars
// muted/fixed so logged-in users never flash AnonymousNav without the recalc cost.

const AUTH_NAV_SKELETON_STYLE = {
  background: 'color-mix(in srgb, var(--card-border) 70%, transparent)',
  opacity: 0.55,
} as const;

function AuthNavPlaceholder() {
  return (
    <NavShell>
      <BrandHomeLink variant="navbar" className="mr-2 shrink-0" />
      <div className="hidden flex-1 items-center gap-2 lg:flex" aria-hidden>
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-9 w-[4.5rem] rounded-[var(--ie-radius-sm)]"
            style={AUTH_NAV_SKELETON_STYLE}
          />
        ))}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ThemeToggle />
        <div
          className="hidden h-9 w-24 rounded-[var(--ie-radius-sm)] lg:block"
          style={AUTH_NAV_SKELETON_STYLE}
          aria-hidden
        />
        <div
          className="hidden size-9 rounded-full lg:block"
          style={AUTH_NAV_SKELETON_STYLE}
          aria-hidden
        />
        <Button
          variant="ghost"
          size="icon"
          className="size-9 shrink-0 lg:hidden"
          aria-label="Open navigation menu"
          aria-busy="true"
          disabled
          style={{ color: 'var(--text-muted)' }}
        >
          <Menu className="size-5 opacity-50" aria-hidden />
        </Button>
        <span className="sr-only">Loading account navigation</span>
      </div>
    </NavShell>
  );
}

// ─── Anonymous navbar ─────────────────────────────────────────────────────────

function AnonymousNav({ user = null }: { user?: NavUser | null }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const loggedIn = Boolean(user);

  const closeMobile = () => {
    setMobileOpen(false);
  };

  const MOBILE_PRACTICE_LINKS = [
    { href: '/interview-questions', label: 'Interview Questions' },
    ...NAV_TOOLS_LINKS,
  ] as const;

  const MOBILE_RESOURCE_LINKS = [
    { href: '/resources', label: 'Resources' },
    { href: '/blog', label: 'Blog' },
    { href: '/help-center', label: 'Help Center' },
  ] as const;

  return (
    <NavShell>
      {/* Logo */}
      <BrandHomeLink variant="navbar" className="mr-2 shrink-0" />

      {/* Desktop: Product / Interview Questions / Tools / Resources / Pricing */}
      <div className="hidden items-center gap-0.5 lg:flex">
        <NavHoverMenu label="Product" items={PRODUCT_ITEMS} menuId="nav-product" />
        <NavHoverMenu
          label="Interview Questions"
          items={INTERVIEW_QUESTIONS_ITEMS}
          menuId="nav-interview-questions"
        />
        <NavHoverMenu label="Tools" items={TOOLS_ITEMS} menuId="nav-tools" />
        <NavHoverMenu
          label="Resources"
          items={RESOURCES_ITEMS}
          columns={2}
          menuId="nav-resources"
        />
        <MarketingNavLink href="/pricing">Pricing</MarketingNavLink>
      </div>

      {/* Desktop: right — logged-in: credits/dashboard/avatar; anon: sign in/up */}
      <div className="ml-auto hidden items-center gap-2 lg:flex">
        {loggedIn && user ? (
          <>
            <Link href="/upgrade" tabIndex={-1} aria-label={`${user.credits_remaining} credits remaining`}>
              <CreditBadge creditsRemaining={user.credits_remaining} />
            </Link>
            <ThemeToggle />
            <Link
              href="/dashboard"
              className={cn(NAV_PRIMARY_CTA_CLASS, 'px-3.5')}
              style={NAV_PRIMARY_CTA_STYLE}
            >
              Dashboard
            </Link>
            <AvatarMenu user={user} />
          </>
        ) : (
          <>
            <ThemeToggle />
            <NavbarSignInLink className="h-9 min-h-9" />
            <NavbarPrimaryCta
              href="/signup"
              ctaKey={CTA_KEYS.SIGN_UP}
              ctaText="Sign up"
              section="navbar"
            >
              Sign up
            </NavbarPrimaryCta>
          </>
        )}
      </div>

      {/* Mobile: Theme / Credits / Hamburger */}
      <div className="ml-auto flex items-center gap-2 lg:hidden">
        {loggedIn && user ? (
          <Link href="/upgrade" tabIndex={-1} aria-label={`${user.credits_remaining} credits remaining`}>
            <CreditBadge creditsRemaining={user.credits_remaining} />
          </Link>
        ) : null}
        <ThemeToggle />
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                className="size-9 shrink-0"
                aria-label="Open navigation menu"
                style={{ color: 'var(--text-primary)' }}
              />
            }
          >
            <Menu className="size-5" aria-hidden />
          </SheetTrigger>
          <SheetContent
            side="right"
            className="flex w-[min(100%,20rem)] max-h-[100dvh] flex-col gap-0 overflow-hidden border-l border-border p-0 motion-reduce:transition-none sm:max-w-sm"
          >
            <SheetHeader className="shrink-0 border-b border-border px-4 py-4 text-left">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              {loggedIn && user ? (
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={user.name}
                    email={user.email}
                    avatarPath={user.avatar_path}
                    oauthPictureUrl={user.oauth_picture_url}
                    size="sm"
                    className="size-9"
                  />
                  <div className="min-w-0">
                    <p
                      className="truncate text-sm font-semibold"
                      style={{ color: 'var(--text-primary)' }}
                    >
                      {user.name ?? 'You'}
                    </p>
                    <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                      {user.email}
                    </p>
                  </div>
                </div>
              ) : (
                <BrandHomeLink variant="navbar" compact wordmarkClassName="text-base" />
              )}
            </SheetHeader>
            <nav
              aria-label="Mobile navigation"
              className="ie-touch-scroll ie-overscroll-contain flex min-h-0 flex-1 flex-col overflow-y-auto p-2"
            >
              <p className={NAV_MOBILE_SECTION_LABEL}>Product</p>
              <MobileNavLink
                href="/how-it-works"
                label="How It Works"
                onNavigate={closeMobile}
              />

              <p className={NAV_MOBILE_SECTION_LABEL}>Practice</p>
              {MOBILE_PRACTICE_LINKS.map(({ href, label }) => (
                <MobileNavLink
                  key={href + label}
                  href={href}
                  label={label}
                  onNavigate={closeMobile}
                />
              ))}

              <p className={NAV_MOBILE_SECTION_LABEL}>Resources</p>
              {MOBILE_RESOURCE_LINKS.map(({ href, label }) => (
                <MobileNavLink
                  key={href + label}
                  href={href}
                  label={label}
                  onNavigate={closeMobile}
                />
              ))}

              <p className={NAV_MOBILE_SECTION_LABEL}>Plans</p>
              <MobileNavLink
                href="/pricing"
                label="Pricing"
                onNavigate={closeMobile}
              />
            </nav>
            <div
              className="shrink-0 space-y-2 border-t border-border bg-popover p-2"
              style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom, 0px))' }}
            >
              {loggedIn && user ? (
                <>
                  <Link
                    href="/dashboard"
                    onClick={closeMobile}
                    className={cn(NAV_PRIMARY_CTA_CLASS, 'w-full min-h-11 justify-center py-3 text-base')}
                    style={NAV_PRIMARY_CTA_STYLE}
                  >
                    Dashboard
                  </Link>
                  <Link
                    href={getDefaultInterviewStartPath()}
                    onClick={closeMobile}
                    className={cn(NAV_MOBILE_LINK_BASE, 'justify-center gap-2')}
                  >
                    <Play className="size-4 shrink-0" aria-hidden />
                    Start Interview
                  </Link>
                </>
              ) : (
                <>
                  <NavbarSignInLink
                    onClick={closeMobile}
                    className="w-full min-h-11 py-3 text-base"
                  />
                  <NavbarPrimaryCta
                    href="/signup"
                    ctaKey={CTA_KEYS.SIGN_UP}
                    ctaText="Sign up"
                    section="navbar_mobile"
                    onClick={closeMobile}
                    className="w-full min-h-11 py-3 text-base"
                  >
                    Sign up
                  </NavbarPrimaryCta>
                </>
              )}
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </NavShell>
  );
}

// ─── Navbar (main export) ─────────────────────────────────────────────────────

/**
 * Marketing navbar — always Product/Tools/Resources links on marketing routes.
 * Logged-in users keep marketing IA; right side shows credits + Dashboard + avatar
 * (Dashboard/History/Analytics live in DashboardChrome sidebar, not here).
 *
 * Auth resolution is handled by useMarketingNavbarAuth. While auth is pending
 * (including SSR), AuthNavPlaceholder avoids a Sign in/Sign up flash.
 *
 * Use <NavbarSlot /> in the root layout (it suppresses rendering on
 * dashboard/auth routes which have their own chrome).
 */
export function Navbar() {
  const { showAuthPlaceholder, user } = useMarketingNavbarAuth();

  if (showAuthPlaceholder) return <AuthNavPlaceholder />;
  return <AnonymousNav user={user} />;
}
