'use client';

import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { CommunityHubLink } from '@/components/community/CommunityHubLink';

export function CommunityNotificationsStrip() {
  return (
    <div
      className="mt-4 rounded-xl border p-4"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 18%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 4%, var(--bg-secondary))',
      }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
        Also stay updated on WhatsApp
      </p>
      <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
        In-app emails are one channel — explore our community hub for job alerts and peer discussions.
      </p>
      <CommunityHubLink
        placement="settings_notifications"
        className="mt-3 inline-flex text-sm font-medium text-[var(--accent-primary)] transition-opacity hover:opacity-80"
      >
        Open community hub →
      </CommunityHubLink>
    </div>
  );
}
