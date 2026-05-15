import type { ReactNode } from 'react';
import { MarketingFooter } from '@/components/layout/MarketingFooter';

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div
      className="ie-landing-premium flex min-h-screen flex-col"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      {/* Navbar is rendered by <NavbarSlot /> in the root layout */}
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
