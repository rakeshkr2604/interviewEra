'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Users, BarChart3, Calendar, Settings, Home, type LucideIcon } from 'lucide-react';

const navItems: { href: string; label: string; icon: LucideIcon }[] = [
  { href: '/college/dashboard', label: 'Overview', icon: Home },
  { href: '/college/dashboard/students', label: 'Students', icon: Users },
  { href: '/college/dashboard/deadlines', label: 'Deadlines', icon: Calendar },
  { href: '/college/dashboard/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/college/dashboard/settings', label: 'Settings', icon: Settings },
];

function NavItem({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/college/dashboard' && pathname.startsWith(href));
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      href={href}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150"
      style={
        isActive
          ? {
              background: `color-mix(in srgb, var(--accent-primary) 14%, transparent)`,
              color: 'var(--accent-primary)',
              boxShadow: `0 0 0 1px color-mix(in srgb, var(--accent-primary) 20%, transparent) inset`,
            }
          : hovered
            ? {
                background: `color-mix(in srgb, var(--text-primary) 6%, transparent)`,
                color: 'var(--text-primary)',
              }
            : {
                color: 'var(--text-secondary)',
              }
      }
    >
      <Icon
        className="h-4 w-4 shrink-0"
        style={{ color: isActive ? 'var(--accent-primary)' : hovered ? 'var(--text-primary)' : 'var(--text-muted)' }}
      />
      {label}
    </Link>
  );
}

export function CollegeDashboardNav() {
  return (
    <nav className="space-y-0.5">
      {navItems.map((item) => (
        <NavItem key={item.href} {...item} />
      ))}
    </nav>
  );
}
