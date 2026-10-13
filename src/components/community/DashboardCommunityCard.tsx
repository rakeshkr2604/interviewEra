'use client';

import { Users, X } from 'lucide-react';
import { useState } from 'react';
import { COMMUNITY_COPY } from '@/lib/community/community';
import {
  dismissDashboardCard,
  shouldShowDashboardCard,
} from '@/lib/community/storage';
import { useCommunityStorageSnapshot } from '@/lib/community/use-community-storage';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';

/** SSR/hydration snapshot: show the card. Hiding until localStorage hydrates was shifting the footer. */
export const DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE = true

export function DashboardCommunityCard() {
  const storageShow = useCommunityStorageSnapshot(
    shouldShowDashboardCard,
    () => DASHBOARD_COMMUNITY_CARD_SERVER_VISIBLE,
  );
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const show = storageShow && !dismissedLocally;

  if (!show) return null;

  return (
    <section
      className="dashboard-section relative"
      aria-labelledby="dashboard-community-heading"
      data-testid="dashboard-community-card"
    >
      <button
        type="button"
        onClick={() => {
          dismissDashboardCard();
          setDismissedLocally(true);
        }}
        className="absolute right-3 top-3 z-10 min-h-11 min-w-11 rounded-md p-2 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)]"
        aria-label="Dismiss community card"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="dashboard-premium-card flex items-start gap-3 px-4 py-4 sm:px-6 sm:py-5">
        <div
          className="flex size-9 shrink-0 items-center justify-center rounded-lg"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
            color: 'var(--text-muted)',
          }}
        >
          <Users className="size-4" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-8">
          <h2
            id="dashboard-community-heading"
            className="dashboard-section-title !mt-0"
          >
            {COMMUNITY_COPY.dashboardTitle}
          </h2>
          <p className="dashboard-section-subtitle text-sm" style={{ color: 'var(--text-secondary)' }}>
            {COMMUNITY_COPY.dashboardSubtitle}
          </p>
          <CommunityHubLink
            placement="dashboard_card"
            className="mt-3 inline-flex min-h-10 items-center rounded-xl border border-[var(--card-border)] bg-[color-mix(in_srgb,var(--card-bg)_88%,transparent)] px-4 py-2 text-sm font-medium text-[var(--text-primary)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Explore community hub →
          </CommunityHubLink>
        </div>
      </div>
    </section>
  );
}
