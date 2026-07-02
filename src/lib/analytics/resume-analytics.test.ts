import { afterEach, describe, expect, it, vi } from 'vitest';
import { trackResumeDeletedClient } from '@/lib/analytics/resume-analytics-client';
import { trackResumeDeletedServer } from '@/lib/analytics/resume-analytics-server';

vi.mock('@/lib/analytics/product-events-server', () => ({
  trackProductEventServer: vi.fn(),
}));

vi.mock('@/lib/analytics/product-events', () => ({
  trackProductEventClient: vi.fn(),
}));

vi.mock('@/lib/analytics/gtag', () => ({
  trackEvent: vi.fn(),
}));

import { trackProductEventServer } from '@/lib/analytics/product-events-server';
import { trackProductEventClient } from '@/lib/analytics/product-events';
import { trackEvent } from '@/lib/analytics/gtag';

describe('resume_deleted analytics', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('persists server event with resume_id and user_id', () => {
    trackResumeDeletedServer({
      user_id: 'user-1',
      resume_id: 'resume-1',
      source: 'api_resume_delete',
    });

    expect(trackProductEventServer).toHaveBeenCalledWith({
      event_name: 'resume_deleted',
      user_id: 'user-1',
      resume_id: 'resume-1',
      source: 'api_resume_delete',
    });
  });

  it('emits client GA4 + product event on delete success', () => {
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });

    trackResumeDeletedClient({
      user_id: 'user-1',
      resume_id: 'resume-1',
      source: 'resume_workspace',
    });

    expect(trackProductEventClient).toHaveBeenCalledWith('resume_deleted', {
      user_id: 'user-1',
      resume_id: 'resume-1',
      source: 'resume_workspace',
    });
    expect(trackEvent).toHaveBeenCalledWith(
      'resume_deleted',
      expect.objectContaining({ event_name: 'resume_deleted', resume_id: 'resume-1' }),
    );
  });
});
