import type { ReactNode } from 'react';
import { MarketingFooter } from '@/components/layout/MarketingFooter';
import { CommunityBanner } from '@/components/community/CommunityBanner';
// Route-scoped: premium landing v3 styles load only on marketing routes + the homepage
// (which renders this layout), not on auth/dashboard/app routes.
import './marketing.css';

interface MarketingLayoutProps {
  children: ReactNode;
}

export default function MarketingLayout({ children }: MarketingLayoutProps) {
  return (
    <div
      className="ie-landing-premium flex min-h-screen flex-col"
      style={{ background: 'var(--page-gradient)', color: 'var(--text-primary)' }}
    >
      <CommunityBanner />
      {/* Navbar is rendered by <NavbarSlot /> in the root layout */}
      <div className="flex-1">{children}</div>
      <MarketingFooter />
    </div>
  );
}
