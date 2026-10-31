'use client';

import { Users } from 'lucide-react';
import { COMMUNITY_COPY } from '@/lib/community/community';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';

/** SSR/hydration snapshot: show the card. Hiding until localStorage hydrates was shifting the footer. */
export const DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE = true

export function DashboardCommunityCard() {
  return (
    <section
      className="dashboard-section"
      aria-labelledby="dashboard-community-heading"
      data-testid="dashboard-community-card"
    >
      <div className="dashboard-premium-card flex items-center gap-3 px-4 py-4 sm:px-5 sm:py-4">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--text-muted)',
          }}
        >
          <Users className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <h2
            id="dashboard-community-heading"
            className="text-sm font-semibold leading-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            {COMMUNITY_COPY.dashboardTitle}
          </h2>
          <p className="mt-0.5 truncate text-xs" style={{ color: 'var(--text-muted)' }}>
            {COMMUNITY_COPY.dashboardSubtitle}
          </p>
        </div>
        <CommunityHubLink
          placement="dashboard_card"
          className="shrink-0 inline-flex min-h-9 items-center rounded-xl border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card-bg)_88%,transparent)] px-3.5 py-2 text-xs font-semibold text-[var(--text-primary)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          Explore →
        </CommunityHubLink>
      </div>
    </section>
  );
}
