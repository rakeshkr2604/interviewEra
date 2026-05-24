'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  Award,
  BarChart2,
  BookOpen,
  Building2,
  ChevronDown,
  Code2,
  CreditCard,
  Download,
  GraduationCap,
  HelpCircle,
  History,
  Layers,
  LayoutDashboard,
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
import { BrandWordmarkSplit } from '@/components/brand/BrandWordmarkSplit';
import { CreditBadge } from '@/components/layout/CreditBadge';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
import { cn } from '@/lib/utils';
import type { PlanTier } from '@/types/app.types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NavUser {
  name: string | null;
  email: string;
  plan_tier: PlanTier;
  credits_remaining: number;
}

type AuthVariant = 'loading' | 'anon' | 'student' | 'admin';

// ─── Nav item data ─────────────────────────────────────────────────────────────

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
    label: 'AI Mock Interviews',
    href: '/#how-it-works',
    desc: 'Resume-native, scored mock sessions',
  },
  {
    icon: Building2,
    label: 'Campus Placements',
    href: '/campus',
    desc: 'Batch training + T&P analytics',
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
    href: '/interview-questions/companies/tcs',
    desc: 'NQT + technical + HR rounds',
  },
  {
    icon: Layers,
    label: 'React Interview Questions',
    href: '/interview-questions/topics/react',
    desc: 'Hooks, state, performance topics',
  },
] as const;

const TOOLS_ITEMS = [
  {
    icon: Sparkles,
    label: 'Question Generator',
    href: '/tools/question-generator',
    desc: 'Role-specific questions in seconds',
  },
  {
    icon: Shield,
    label: 'ATS Resume Checker',
    href: '/tools/ats-checker',
    desc: 'Score your resume against job roles',
  },
  {
    icon: Award,
    label: 'STAR Answer Builder',
    href: '/tools/star-builder',
    desc: 'Structure behavioral answers clearly',
  },
] as const;

const RESOURCES_ITEMS = [
  {
    icon: BookOpen,
    label: 'Blog',
    href: '/blog',
    desc: 'Interview prep articles and guides',
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
    href: '/help',
    desc: 'FAQs and platform how-tos',
  },
] as const;

const STUDENT_NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/history', label: 'History', icon: History, exact: false },
  { href: '/analytics', label: 'Analytics', icon: BarChart2, exact: false },
  { href: '/profile/badges', label: 'Badges', icon: Award, exact: false },
] as const;

const ADMIN_NAV = [
  { href: '/college/dashboard', label: 'Overview', icon: LayoutDashboard, exact: true },
  { href: '/college/dashboard/students', label: 'Students', icon: Users, exact: false },
  { href: '/college/dashboard/analytics', label: 'Analytics', icon: BarChart2, exact: false },
  { href: '/college/dashboard/deadlines', label: 'Deadlines', icon: CreditCard, exact: false },
] as const;

const BRAND_MARK = '/brand/logos/icon-only.svg';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// ─── Shared shell (sticky + scroll-aware blur/shadow) ─────────────────────────

function NavShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll(); // sync on mount in case page is already scrolled
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      role="banner"
      className={cn(
        'sticky top-0 z-50 h-16 border-b transition-shadow duration-200',
        scrolled && 'shadow-sm',
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: scrolled
          ? 'color-mix(in srgb, var(--bg-primary) 82%, transparent)'
          : 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
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
}

function NavHoverMenu({
  label,
  items,
  onNavigate,
}: {
  label: string;
  items: readonly DropItem[];
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const show = useCallback(() => {
    clearTimeout(closeTimer.current);
    setOpen(true);
  }, []);

  const hide = useCallback(() => {
    closeTimer.current = setTimeout(() => setOpen(false), 180);
  }, []);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

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
        aria-expanded={open}
        aria-haspopup="menu"
        className={cn(
          'flex h-9 items-center gap-1 rounded-lg px-3 text-sm font-medium transition-colors',
          open
            ? 'bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] text-(--text-primary)'
            : 'text-(--text-secondary) hover:text-(--text-primary) hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]',
        )}
      >
        {label}
        <ChevronDown
          className={cn('size-3.5 transition-transform duration-150', open && 'rotate-180')}
          aria-hidden
        />
      </button>

      <div
        role="menu"
        aria-label={`${label} menu`}
        className={cn(
          'absolute left-0 top-[calc(100%+6px)] z-50 min-w-71 rounded-xl border p-1.5 shadow-xl',
          'transition-[opacity,transform] duration-150 ease-out',
          open
            ? 'pointer-events-auto opacity-100 translate-y-0'
            : 'pointer-events-none opacity-0 -translate-y-1',
        )}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--bg-primary) 95%, transparent)',
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
        }}
      >
        {items.map(({ icon: Icon, label: itemLabel, href, desc }) => (
          <Link
            key={href + itemLabel}
            href={href}
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onNavigate?.();
            }}
            className="group flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)]"
          >
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg"
              style={{
                background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
                color: 'var(--accent-primary)',
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
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── Active nav link (student + admin) ───────────────────────────────────────

function NavLink({
  href,
  exact = false,
  icon: Icon,
  children,
}: {
  href: string;
  exact?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? '';
  const isActive = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link
      href={href}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium transition-colors',
        isActive
          ? 'bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] font-semibold text-(--accent-primary)'
          : 'text-(--text-secondary) hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] hover:text-(--text-primary)',
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" aria-hidden />}
      {children}
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

  const handleLogout = async () => {
    const { createClient } = await import('@/lib/supabase/client');
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  };

  const showUpgrade = !isAdmin && (user.plan_tier === 'free' || user.plan_tier === 'starter');

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open user menu"
        className="flex size-9 shrink-0 items-center justify-center rounded-full outline-none ring-2 ring-transparent transition-shadow hover:ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)] focus-visible:ring-(--accent-primary)"
      >
        <Avatar className="size-8 cursor-pointer">
          <AvatarFallback
            className="text-xs font-semibold"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
              color: '#fff',
            }}
          >
            {getInitials(user.name, user.email)}
          </AvatarFallback>
        </Avatar>
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
                color: 'var(--accent-primary)',
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
          onClick={() => router.push('/help')}
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
              style={{ color: 'var(--accent-primary)' }}
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

// ─── Anonymous navbar ─────────────────────────────────────────────────────────

function AnonymousNav() {
  const [mobileOpen, setMobileOpen] = useState(false);

  const MOBILE_LINKS = [
    { href: '/#how-it-works', label: 'AI Mock Interviews' },
    { href: '/interview-questions', label: 'Interview Questions' },
    { href: '/tools/question-generator', label: 'Tools' },
    { href: '/blog', label: 'Blog' },
    { href: '/pricing', label: 'Pricing' },
  ] as const;

  return (
    <NavShell>
      {/* Logo */}
      <BrandHomeLink variant="navbar" className="mr-2 shrink-0" />

      {/* Desktop: Product / Interview Questions / Tools / Resources / Pricing */}
      <div className="hidden items-center gap-0.5 md:flex">
        <NavHoverMenu label="Product" items={PRODUCT_ITEMS} />
        <NavHoverMenu label="Interview Questions" items={INTERVIEW_QUESTIONS_ITEMS} />
        <NavHoverMenu label="Tools" items={TOOLS_ITEMS} />
        <NavHoverMenu label="Resources" items={RESOURCES_ITEMS} />
        <Link
          href="/pricing"
          className="flex h-9 items-center rounded-lg px-3 text-sm font-medium text-(--text-secondary) transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_8%,transparent)] hover:text-(--text-primary)"
        >
          Pricing
        </Link>
      </div>

      {/* Desktop: right — Theme / Login / CTA */}
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <ThemeToggle />
        <Link
          href="/login"
          className="inline-flex h-9 items-center rounded-lg px-3 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--text-secondary)' }}
        >
          Login
        </Link>
        <Link
          href="/signup"
          className="inline-flex h-9 items-center rounded-lg px-4 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          }}
        >
          Start Free
        </Link>
      </div>

      {/* Mobile: Theme / Hamburger */}
      <div className="ml-auto flex items-center gap-2 md:hidden">
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
            className="w-[min(100%,20rem)] gap-0 border-l border-border p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <BrandHomeLink variant="navbar" compact wordmarkClassName="text-base" />
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="flex flex-col p-2">
              {MOBILE_LINKS.map(({ href, label }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium text-foreground transition-colors active:bg-accent"
                >
                  {label}
                </Link>
              ))}
              <div className="mx-2 my-2 border-t border-border" aria-hidden />
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
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                }}
              >
                Start Free
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </NavShell>
  );
}

// ─── Student navbar ───────────────────────────────────────────────────────────

function StudentNav({ user }: { user: NavUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '';

  return (
    <NavShell>
      {/* Logo → dashboard */}
      <Link
        href="/dashboard"
        className="mr-2 inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        aria-label="Go to dashboard"
      >
        <Image
          src={BRAND_MARK}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-xl"
          style={{
            boxShadow: '0 4px 14px color-mix(in srgb, var(--accent-primary) 22%, transparent)',
          }}
          alt=""
        />
        <BrandWordmarkSplit className="text-[17px] tracking-[-0.04em]" />
      </Link>

      {/* Desktop: nav links */}
      <div className="hidden items-center gap-0.5 md:flex">
        {STUDENT_NAV.map(({ href, label, icon, exact }) => (
          <NavLink key={href} href={href} icon={icon} exact={exact}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Desktop: right — Credits / Theme / Start Interview / Avatar */}
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <Link href="/upgrade" tabIndex={-1} aria-label={`${user.credits_remaining} credits remaining`}>
          <CreditBadge creditsRemaining={user.credits_remaining} />
        </Link>
        <ThemeToggle />
        <Link
          href="/onboarding"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          }}
        >
          <Play className="size-3.5" aria-hidden />
          Start Interview
        </Link>
        <AvatarMenu user={user} />
      </div>

      {/* Mobile: Credits / Theme / Hamburger */}
      <div className="ml-auto flex items-center gap-2 md:hidden">
        <Link href="/upgrade" tabIndex={-1} aria-label={`${user.credits_remaining} credits remaining`}>
          <CreditBadge creditsRemaining={user.credits_remaining} />
        </Link>
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
            className="w-[min(100%,20rem)] gap-0 border-l border-border p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
                      color: '#fff',
                    }}
                  >
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
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
            </SheetHeader>
            <nav aria-label="Mobile navigation" className="flex flex-col p-2">
              <Link
                href="/onboarding"
                onClick={() => setMobileOpen(false)}
                className="mx-2 mb-2 mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                }}
              >
                <Play className="size-4" aria-hidden />
                Start Interview
              </Link>
              {STUDENT_NAV.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] font-semibold text-(--accent-primary)'
                        : 'text-foreground active:bg-accent',
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
              <div className="mx-2 my-2 border-t border-border" aria-hidden />
              {(user.plan_tier === 'free' || user.plan_tier === 'starter') && (
                <Link
                  href="/upgrade"
                  onClick={() => setMobileOpen(false)}
                  className="rounded-xl px-4 py-3.5 text-base font-medium"
                  style={{ color: 'var(--accent-primary)' }}
                >
                  Upgrade to Pro
                </Link>
              )}
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-muted-foreground"
              >
                <Settings className="size-5" aria-hidden />
                Settings
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </NavShell>
  );
}

// ─── Admin navbar ─────────────────────────────────────────────────────────────

function AdminNav({ user }: { user: NavUser }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname() ?? '';

  return (
    <NavShell>
      {/* Logo → admin dashboard */}
      <Link
        href="/college/dashboard"
        className="mr-2 inline-flex shrink-0 items-center gap-2.5 transition-opacity hover:opacity-90"
        aria-label="Go to admin dashboard"
      >
        <Image
          src={BRAND_MARK}
          width={32}
          height={32}
          className="size-8 shrink-0 rounded-xl"
          style={{
            boxShadow: '0 4px 14px color-mix(in srgb, var(--accent-primary) 22%, transparent)',
          }}
          alt=""
        />
        <div className="flex items-baseline gap-1.5">
          <BrandWordmarkSplit className="text-[17px] tracking-[-0.04em]" />
          <span
            className="rounded-md px-1.5 py-0.5 text-[11px] font-semibold"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            Campus
          </span>
        </div>
      </Link>

      {/* Desktop: nav links */}
      <div className="hidden items-center gap-0.5 md:flex">
        {ADMIN_NAV.map(({ href, label, icon, exact }) => (
          <NavLink key={href} href={href} icon={icon} exact={exact}>
            {label}
          </NavLink>
        ))}
      </div>

      {/* Desktop: right — Export / Theme / Invite / Avatar */}
      <div className="ml-auto hidden items-center gap-2 md:flex">
        <button
          type="button"
          onClick={() => {
            /* TODO: wire CSV export action */
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition-colors hover:bg-[color-mix(in_srgb,var(--accent-primary)_6%,transparent)]"
          style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          aria-label="Export data as CSV"
        >
          <Download className="size-4" aria-hidden />
          Export CSV
        </button>
        <ThemeToggle />
        <Link
          href="/admin/bulk-invite"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3.5 text-sm font-semibold text-white transition-opacity hover:opacity-90"
          style={{
            background: 'var(--accent-primary)',
            boxShadow:
              'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          }}
        >
          <Users className="size-3.5" aria-hidden />
          Invite Students
        </Link>
        <AvatarMenu user={user} isAdmin />
      </div>

      {/* Mobile: Theme / Hamburger */}
      <div className="ml-auto flex items-center gap-2 md:hidden">
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
            className="w-[min(100%,20rem)] gap-0 border-l border-border p-0 sm:max-w-sm"
          >
            <SheetHeader className="border-b border-border px-4 py-4 text-left">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="flex items-center gap-3">
                <Avatar className="size-9">
                  <AvatarFallback
                    className="text-xs font-semibold"
                    style={{
                      background:
                        'linear-gradient(135deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 70%, #5b21b6))',
                      color: '#fff',
                    }}
                  >
                    {getInitials(user.name, user.email)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {user.name ?? 'Admin'}
                  </p>
                  <p className="truncate text-xs" style={{ color: 'var(--text-secondary)' }}>
                    {user.email}
                  </p>
                </div>
              </div>
            </SheetHeader>
            <nav aria-label="Admin mobile navigation" className="flex flex-col p-2">
              <Link
                href="/admin/bulk-invite"
                onClick={() => setMobileOpen(false)}
                className="mx-2 mb-2 mt-1 flex items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-base font-semibold text-white"
                style={{
                  background: 'var(--accent-primary)',
                  boxShadow:
                    'inset 0 1px 0 rgba(255,255,255,0.14), 0 6px 18px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
                }}
              >
                <Users className="size-4" aria-hidden />
                Invite Students
              </Link>
              {ADMIN_NAV.map(({ href, label, icon: Icon, exact }) => {
                const isActive = exact ? pathname === href : pathname.startsWith(href);
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={() => setMobileOpen(false)}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium transition-colors',
                      isActive
                        ? 'bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)] font-semibold text-(--accent-primary)'
                        : 'text-foreground active:bg-accent',
                    )}
                  >
                    <Icon className="size-5 shrink-0" aria-hidden />
                    {label}
                  </Link>
                );
              })}
              <div className="mx-2 my-2 border-t border-border" aria-hidden />
              <button
                type="button"
                onClick={() => {
                  setMobileOpen(false);
                  /* TODO: CSV export */
                }}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-foreground"
              >
                <Download className="size-5" aria-hidden />
                Export CSV
              </button>
              <Link
                href="/dashboard"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-muted-foreground"
              >
                <Shield className="size-5" aria-hidden />
                Student View
              </Link>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </NavShell>
  );
}

// ─── Skeleton (prevents CLS during auth detection) ────────────────────────────

function NavSkeleton() {
  return (
    <header
      className="sticky top-0 z-50 h-16 border-b"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
      }}
    >
      <div
        className={cn(
          LANDING_PAGE_CONTAINER,
          'flex h-full items-center justify-between px-4 sm:px-5',
        )}
      >
        <div
          className="h-8 w-36 animate-pulse rounded-lg"
          style={{ background: 'var(--card-border)' }}
        />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg" style={{ background: 'var(--card-border)' }} />
          <div className="hidden h-8 w-16 animate-pulse rounded-lg md:block" style={{ background: 'var(--card-border)' }} />
          <div className="hidden h-8 w-24 animate-pulse rounded-lg md:block" style={{ background: 'var(--card-border)' }} />
        </div>
      </div>
    </header>
  );
}

// ─── Navbar (main export) ─────────────────────────────────────────────────────

/**
 * Role-aware navbar — three variants:
 * - anon:    Product/Solutions/Resources dropdowns + Login/Start Free
 * - student: App nav links + credits badge + Start Interview CTA + avatar menu
 * - admin:   Admin nav links + Export CSV + Invite Students CTA + avatar menu
 *
 * Auth detection is deferred via requestIdleCallback to keep the initial
 * JS bundle light. Shows a pulse skeleton during detection.
 *
 * Use <NavbarSlot /> in the root layout (it suppresses rendering on
 * dashboard/auth routes which have their own chrome).
 */
export function Navbar() {
  const [variant, setVariant] = useState<AuthVariant>('loading');
  const [user, setUser] = useState<NavUser | null>(null);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    const detect = async () => {
      try {
        const { createClient } = await import('@/lib/supabase/client');
        if (cancelled) return;
        const supabase = createClient();

        const { data: authData, error: authError } = await supabase.auth.getUser();

        if (authError) {
          const { signOutIfStaleAuth } = await import('@/lib/supabase/session');
          await signOutIfStaleAuth(supabase, authError);
          if (!cancelled) setVariant('anon');
          return;
        }

        const resolveUser = async (uid: string, email: string) => {
          const { data: profile } = await supabase
            .from('users')
            .select('name, plan_tier, credits_remaining')
            .eq('id', uid)
            .maybeSingle();
          if (cancelled) return;
          const planTier = (profile?.plan_tier ?? 'free') as PlanTier;
          setUser({
            name: profile?.name ?? null,
            email,
            plan_tier: planTier,
            credits_remaining: profile?.credits_remaining ?? 0,
          });
          setVariant(planTier === 'campus_admin' ? 'admin' : 'student');
        };

        const authUser = authData.user;
        if (!authUser) {
          if (!cancelled) setVariant('anon');
        } else {
          await resolveUser(authUser.id, authUser.email ?? '');
        }

        // Listen for session changes (login / logout / token refresh)
        const { data: sub } = supabase.auth.onAuthStateChange(async (_event, session) => {
          if (cancelled) return;
          if (!session?.user) {
            setVariant('anon');
            setUser(null);
            return;
          }
          await resolveUser(session.user.id, session.user.email ?? '');
        });
        unsubscribe = () => sub.subscription.unsubscribe();
      } catch {
        if (!cancelled) setVariant('anon');
      }
    };

    type IdleWindow = Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    const w = window as IdleWindow;
    const handle: number | ReturnType<typeof setTimeout> = w.requestIdleCallback
      ? w.requestIdleCallback(() => void detect(), { timeout: 3000 })
      : setTimeout(() => void detect(), 0);

    return () => {
      cancelled = true;
      unsubscribe?.();
      if (typeof handle === 'number') w.cancelIdleCallback?.(handle);
      else clearTimeout(handle);
    };
  }, []);

  if (variant === 'loading') return <NavSkeleton />;
  if (variant === 'admin' && user) return <AdminNav user={user} />;
  if (variant === 'student' && user) return <StudentNav user={user} />;
  return <AnonymousNav />;
}
