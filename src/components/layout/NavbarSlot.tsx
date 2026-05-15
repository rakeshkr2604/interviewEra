'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';

/**
 * Thin wrapper that renders <Navbar /> only on marketing-side routes.
 * Dashboard, admin, campus, and auth pages have their own chrome
 * (DashboardChrome, AdminTopBar, CampusDashboardChrome) — rendering
 * the Navbar there would produce a double header.
 *
 * Place this in the root layout so the Navbar is globally available
 * without adding it to every marketing sub-layout individually.
 */

const SUPPRESS_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/interview',
  '/report',
  '/history',
  '/analytics',
  '/settings',
  '/upgrade',
  '/feedback',
  '/profile',
  '/admin',
  '/college/dashboard',
  '/college/signup',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/auth',
] as const;

export function NavbarSlot() {
  const pathname = usePathname() ?? '';
  const suppressed = SUPPRESS_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (suppressed) return null;
  return <Navbar />;
}
