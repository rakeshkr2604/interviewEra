'use client';

import { usePathname } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { shouldSuppressNavbar } from '@/lib/layout/navbar-suppress';

/**
 * Thin wrapper that renders <Navbar /> only on marketing-side routes.
 * Dashboard, admin, campus, platform, and auth pages have their own chrome
 * (DashboardChrome, AdminTopBar, CampusDashboardChrome) — rendering
 * the Navbar there would produce a double header.
 *
 * Place this in the root layout so the Navbar is globally available
 * without adding it to every marketing sub-layout individually.
 *
 * Static import (not `next/dynamic`): dynamic SSR of this client chrome was
 * stacking AuthNavPlaceholder + AnonymousNav as sibling headers. Suppress
 * prefixes still keep Navbar off authenticated routes; question-bank isolation
 * remains via `@/lib/seo/content/nav-links` (not `programmatic/questions`).
 *
 * Suppress prefixes: `@/lib/layout/navbar-suppress`.
 */
export function NavbarSlot() {
  const pathname = usePathname() ?? '';
  if (shouldSuppressNavbar(pathname)) return null;
  return <Navbar />;
}
