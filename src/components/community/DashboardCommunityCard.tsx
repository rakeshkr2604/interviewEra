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

export function DashboardCommunityCard() {
  const storageShow = useCommunityStorageSnapshot(shouldShowDashboardCard, () => false);
  const [dismissedLocally, setDismissedLocally] = useState(false);
  const show = storageShow && !dismissedLocally;

  if (!show) return null;

  return (
    <section className="relative mb-4 sm:mb-5" aria-labelledby="dashboard-community-heading">
      <button
        type="button"
        onClick={() => {
          dismissDashboardCard();
          setDismissedLocally(true);
        }}
        className="absolute right-3 top-3 rounded-md p-1 opacity-50 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)]"
        aria-label="Dismiss community card"
      >
        <X className="size-4" aria-hidden />
      </button>

      <div className="dashboard-premium-card flex items-start gap-3 p-5 sm:p-6">
        <div
          className="flex size-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Users className="size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 pr-6">
          <h2
            id="dashboard-community-heading"
            className="text-base font-semibold sm:text-lg"
            style={{ color: 'var(--text-primary)' }}
          >
            {COMMUNITY_COPY.dashboardTitle}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
            {COMMUNITY_COPY.dashboardSubtitle}
          </p>
          <CommunityHubLink
            placement="dashboard_card"
            className="mt-4 inline-flex rounded-xl bg-[var(--accent-primary)] px-4 py-2 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:opacity-95"
          >
            Explore community hub →
          </CommunityHubLink>
        </div>
      </div>
    </section>
  );
}
