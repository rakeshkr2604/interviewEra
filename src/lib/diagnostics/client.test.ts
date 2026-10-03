import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _peekDiagnosticQueueForTests,
  _resetDiagnosticClientForTests,
  diagnosticTypeForMicEvent,
  emitInterviewDiagnostic,
  flushInterviewDiagnostics,
} from '@/lib/diagnostics/client';

const IV = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';

describe('diagnostic client helper', () => {
  afterEach(() => {
    _resetDiagnosticClientForTests();
    vi.unstubAllGlobals();
  });

  it('maps mic critical events', () => {
    expect(diagnosticTypeForMicEvent('mic_permission_denied')).toBe('mic_permission_denied');
    expect(diagnosticTypeForMicEvent('mic_acquire_failed')).toBe('mic_acquire_failed');
    expect(diagnosticTypeForMicEvent('speech_started')).toBeNull();
  });

  it('queues without throwing and dedupes rapid duplicates', () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    emitInterviewDiagnostic({
      interviewId: IV,
      eventType: 'mic_permission_denied',
      errorCode: 'mic_denied',
    });
    emitInterviewDiagnostic({
      interviewId: IV,
      eventType: 'mic_permission_denied',
      errorCode: 'mic_denied',
    });
    expect(_peekDiagnosticQueueForTests(IV)).toBe(1);
  });

  it('flush handles fetch rejection without unhandled rejection', async () => {
    vi.stubGlobal('window', { setTimeout, clearTimeout });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('offline');
      }),
    );
    emitInterviewDiagnostic({
      interviewId: IV,
      eventType: 'stt_connection_failed',
      errorCode: 'stt_ws_error',
    });
    await expect(flushInterviewDiagnostics(IV)).resolves.toBeUndefined();
  });
});
