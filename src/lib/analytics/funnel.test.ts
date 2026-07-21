import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetAnalyticsDedupeForTests } from '@/lib/analytics/dedupe';

vi.mock('@/lib/analytics/gtag', () => ({
  trackEvent: vi.fn(),
  isGaEnabled: true,
}));

vi.mock('@/lib/analytics/product-events', () => ({
  trackProductEvent: vi.fn(),
  trackProductEventClient: vi.fn(),
}));

import { trackFunnelEvent } from '@/lib/analytics/funnel';
import { trackEvent } from '@/lib/analytics/gtag';
import { trackProductEvent, trackProductEventClient } from '@/lib/analytics/product-events';

describe('trackFunnelEvent', () => {
  afterEach(() => {
    resetAnalyticsDedupeForTests();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('fires GA4, client product event, and durable funnel beacon on client', async () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', fetchMock);

    trackFunnelEvent('pricing_page_viewed', {
      sourcePage: '/pricing',
      authenticated: false,
    });

    expect(trackProductEventClient).toHaveBeenCalledWith(
      'pricing_page_viewed',
      expect.objectContaining({ source_page: '/pricing', authenticated: false }),
    );
    expect(trackEvent).toHaveBeenCalledWith(
      'pricing_page_viewed',
      expect.objectContaining({ event_name: 'pricing_page_viewed', source_page: '/pricing' }),
    );
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/analytics/funnel-event',
      expect.objectContaining({
        method: 'POST',
        credentials: 'same-origin',
        keepalive: true,
      }),
    );

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.event_name).toBe('pricing_page_viewed');
    expect(body.source_page).toBe('/pricing');
  });

  it('maps mock_interview_completed to interview_completed for durable store', () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', fetchMock);

    trackFunnelEvent('mock_interview_completed', {
      userId: 'user-1',
      interviewId: 'iv-1',
    });

    expect(trackProductEventClient).toHaveBeenCalledWith(
      'interview_completed',
      expect.objectContaining({ user_id: 'user-1', interview_id: 'iv-1' }),
    );
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.event_name).toBe('interview_completed');
  });

  it('skips durable beacon when product tracking is disabled', () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', fetchMock);

    trackFunnelEvent(
      'payment_completed',
      { paymentId: 'pay_1', plan: 'pro', amount: 49900 },
      { product: false },
    );

    expect(trackProductEventClient).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('persists order_id on payment_started durable beacon (not only as dedupe key)', () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', fetchMock);

    trackFunnelEvent('payment_started', {
      userId: 'user-1',
      plan: 'starter',
      amount: 14900,
      source: 'upgrade',
      order_id: 'order_TGBnRqXqsQCisy',
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.event_name).toBe('payment_started');
    expect(body.order_id).toBe('order_TGBnRqXqsQCisy');
    expect(body.plan).toBe('starter');
  });

  it('maps camelCase orderId to snake_case order_id on the beacon', () => {
    const fetchMock = vi.fn().mockResolvedValue({ status: 204 });
    vi.stubGlobal('window', { dispatchEvent: vi.fn() });
    vi.stubGlobal('document', { cookie: '' });
    vi.stubGlobal('fetch', fetchMock);

    trackFunnelEvent('payment_started', {
      plan: 'pro',
      amount: 49900,
      source: 'pricing',
      orderId: 'order_camelCaseTest',
    });

    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body));
    expect(body.order_id).toBe('order_camelCaseTest');
    expect(body.orderId).toBeUndefined();
  });

  it('logs product event on server without client beacon', () => {
    trackFunnelEvent(
      'payment_completed',
      {
        userId: 'user-1',
        paymentId: 'pay_1',
        plan: 'pro',
        amount: 49900,
        source: 'webhook',
      },
      { ga4: false },
    );

    expect(trackProductEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        event_name: 'payment_completed',
        user_id: 'user-1',
        payment_id: 'pay_1',
      }),
    );
    expect(trackProductEventClient).not.toHaveBeenCalled();
  });
});
