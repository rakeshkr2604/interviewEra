'use client';

import Link from 'next/link';
import { Users } from 'lucide-react';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';

/**
 * Standalone Community Hub link block.
 * The candidate dashboard sidebar now renders Community as a collapsible
 * section in `Sidebar.tsx`; this export remains for other chrome that may
 * want the same single-link block without the full nav.
 */
export function SidebarCommunityLinks({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="mt-2 border-t border-[var(--card-border)]/55 pt-3">
      <p
        className="mb-1.5 px-2 text-[10px] font-semibold uppercase tracking-[0.16em]"
        style={{ color: 'var(--text-muted)' }}
      >
        Community
      </p>
      <ul className="space-y-0.5" role="list">
        <li>
          <Link
            href={COMMUNITY_HUB_PATH}
            onClick={() => onNavigate?.()}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-bold leading-snug text-[var(--text-secondary)] transition-none hover:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)] hover:text-[var(--text-primary)]"
          >
            <Users size={18} strokeWidth={2.25} aria-hidden />
            Community Hub
          </Link>
        </li>
      </ul>
    </div>
  );
}
