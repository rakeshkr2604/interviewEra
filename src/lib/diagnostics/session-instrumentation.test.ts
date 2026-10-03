import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  _peekDiagnosticQueueForTests,
  _resetDiagnosticClientForTests,
} from '@/lib/diagnostics/client';
import {
  installInterviewExceptionDiagnostics,
  installInterviewNetworkDiagnostics,
} from '@/lib/diagnostics/session-instrumentation';

const IV = 'bec8589c-5b34-4545-a6e1-82f94ca9d1d7';

describe('session instrumentation', () => {
  afterEach(() => {
    _resetDiagnosticClientForTests();
    vi.unstubAllGlobals();
  });

  it('dedupes repeated offline transitions within the window', () => {
    const listeners = new Map<string, Set<() => void>>();
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      addEventListener: (type: string, fn: () => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, fn: () => void) => {
        listeners.get(type)?.delete(fn);
      },
    });
    vi.stubGlobal('navigator', { onLine: true });

    const cleanup = installInterviewNetworkDiagnostics({ interviewId: IV });
    listeners.get('offline')?.forEach((fn) => fn());
    listeners.get('offline')?.forEach((fn) => fn());
    expect(_peekDiagnosticQueueForTests(IV)).toBe(1);
    cleanup();
  });

  it('skips diagnostic self-noise on window error', () => {
    const listeners = new Map<string, Set<(e: unknown) => void>>();
    vi.stubGlobal('window', {
      setTimeout,
      clearTimeout,
      addEventListener: (type: string, fn: (e: unknown) => void) => {
        const set = listeners.get(type) ?? new Set();
        set.add(fn);
        listeners.set(type, set);
      },
      removeEventListener: (type: string, fn: (e: unknown) => void) => {
        listeners.get(type)?.delete(fn);
      },
    });

    const cleanup = installInterviewExceptionDiagnostics({ interviewId: IV });
    listeners.get('error')?.forEach((fn) =>
      fn({ message: 'Failed /api/interview/diagnostics', error: new Error('x') }),
    );
    expect(_peekDiagnosticQueueForTests(IV)).toBe(0);

    listeners.get('error')?.forEach((fn) =>
      fn({ message: 'boom', error: new TypeError('x is not a function') }),
    );
    expect(_peekDiagnosticQueueForTests(IV)).toBe(1);
    cleanup();
  });
});
