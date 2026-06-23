'use client';

import { useEffect } from 'react';
import { trackCommunityInteraction } from '@/lib/community/analytics';

export function CommunityPageTracker() {
  useEffect(() => {
    trackCommunityInteraction('community_page_view', {
      platform: 'hub',
      placement: 'community_hub',
    });
  }, []);

  return null;
}
