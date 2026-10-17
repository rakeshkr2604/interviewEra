import { describe, expect, it } from 'vitest';
import {
  sanitizeMetadataForTests,
  validateDiagnosticIngestBody,
} from '@/lib/diagnostics/validate';

const IV = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';

describe('validateDiagnosticIngestBody', () => {
  it('accepts allowlisted event types and strips unknown metadata', () => {
    const result = validateDiagnosticIngestBody({
      interview_id: IV,
      events: [
        {
          event_type: 'mic_permission_denied',
          occurred_at: new Date().toISOString(),
          error_code: 'mic_denied',
          client_event_id: '11111111-1111-4111-8111-111111111111',
          metadata: {
            component: 'mic',
            transcript: 'SECRET ANSWER',
            authorization: 'Bearer x',
            retry_count: 1,
          },
        },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.events[0].metadata).toEqual({ component: 'mic', retry_count: 1 });
    expect(result.events[0].confirmation).toBe('client_reported');
  });

  it('rejects unknown event names', () => {
    const result = validateDiagnosticIngestBody({
      interview_id: IV,
      events: [{ event_type: 'not_a_real_event', occurred_at: new Date().toISOString() }],
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.status).toBe(400);
  });

  it('rejects invalid interview ids', () => {
    const result = validateDiagnosticIngestBody({
      interview_id: 'nope',
      events: [{ event_type: 'request_failed', occurred_at: new Date().toISOString() }],
    });
    expect(result.ok).toBe(false);
  });

  it('rejects oversized batches', () => {
    const events = Array.from({ length: 25 }, (_, i) => ({
      event_type: 'network_online',
      occurred_at: new Date().toISOString(),
      client_event_id: `id-${i}`,
    }));
    const result = validateDiagnosticIngestBody({ interview_id: IV, events });
    expect(result.ok).toBe(false);
  });

  it('sanitizes endpoint to path-only api routes', () => {
    const meta = sanitizeMetadataForTests({
      endpoint: '/api/interview/script/turn?token=abc#x',
      component: 'evil',
    });
    expect(meta.endpoint).toBe('/api/interview/script/turn');
    expect(meta.component).toBe('unknown');
  });

  it('keeps mic failure classification metadata and strips free-form secrets', () => {
    const meta = sanitizeMetadataForTests({
      component: 'mic',
      error_name: 'TimeoutError',
      error_kind: 'timeout',
      permission_state: 'prompt',
      retry_count: 2,
      transcript: 'SECRET ANSWER TEXT',
      authorization: 'Bearer x',
    });
    expect(meta).toEqual({
      component: 'mic',
      error_name: 'TimeoutError',
      error_kind: 'timeout',
      permission_state: 'prompt',
      retry_count: 2,
    });
  });
});
