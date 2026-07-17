import { describe, expect, it } from 'vitest';
import {
  classifyMicStartError,
  micFallbackMessageForKind,
} from './mic-error-classification';

function domException(name: string, message = `${name} raised`) {
  return new DOMException(message, name);
}

describe('classifyMicStartError (M11: mic error conflation fix)', () => {
  it('NotAllowedError → permission_denied with denial copy', () => {
    const cls = classifyMicStartError(domException('NotAllowedError', 'Permission denied'));
    expect(cls.kind).toBe('permission_denied');
    expect(cls.errorName).toBe('NotAllowedError');
    expect(cls.errorMessage).toBe('Permission denied');
    expect(cls.candidateMessage).toBe('Microphone access denied — type your answer');
  });

  it('NotSupportedError → unsupported, NOT conflated with denial', () => {
    const cls = classifyMicStartError(
      domException('NotSupportedError', 'Microphone is not available in this browser.'),
    );
    expect(cls.kind).toBe('unsupported');
    expect(cls.errorName).toBe('NotSupportedError');
    expect(cls.kind).not.toBe('permission_denied');
    expect(cls.candidateMessage).toBe('Voice not supported in this browser — type your answer');
  });

  it('NotFoundError → no_device with "no microphone" copy', () => {
    const cls = classifyMicStartError(domException('NotFoundError'));
    expect(cls.kind).toBe('no_device');
    expect(cls.candidateMessage).toBe('No microphone detected — type your answer');
  });

  it('NotReadableError → device_busy with generic copy (transient, no special UX)', () => {
    const cls = classifyMicStartError(domException('NotReadableError', 'Device in use'));
    expect(cls.kind).toBe('device_busy');
    expect(cls.errorName).toBe('NotReadableError');
    expect(cls.candidateMessage).toBe('Voice unavailable — type your answer');
  });

  it('OverconstrainedError → constraint_unsatisfiable, generic copy', () => {
    const cls = classifyMicStartError(domException('OverconstrainedError'));
    expect(cls.kind).toBe('constraint_unsatisfiable');
    expect(cls.candidateMessage).toBe('Voice unavailable — type your answer');
  });

  it('legacy pre-spec names map to the same kinds as their modern equivalents', () => {
    expect(classifyMicStartError(domException('PermissionDeniedError')).kind).toBe('permission_denied');
    expect(classifyMicStartError(domException('DevicesNotFoundError')).kind).toBe('no_device');
    expect(classifyMicStartError(domException('TrackStartError')).kind).toBe('device_busy');
  });

  it('SecurityError (permissions policy / insecure context denial) → permission_denied', () => {
    expect(classifyMicStartError(domException('SecurityError')).kind).toBe('permission_denied');
  });

  it('coordinator TimeoutError → timeout, AbortError → aborted', () => {
    expect(classifyMicStartError(domException('TimeoutError', 'getUserMedia timed out after 8000ms')).kind).toBe('timeout');
    expect(classifyMicStartError(domException('AbortError', 'Aborted')).kind).toBe('aborted');
  });

  it('plain Error with an unrecognized name → unknown, real name preserved for logging', () => {
    const cls = classifyMicStartError(new Error('Could not open voice connection.'));
    expect(cls.kind).toBe('unknown');
    expect(cls.errorName).toBe('Error');
    expect(cls.errorMessage).toBe('Could not open voice connection.');
    expect(cls.candidateMessage).toBe('Voice unavailable — type your answer');
  });

  it('non-Error values → unknown with stringified message and null name', () => {
    const cls = classifyMicStartError('websocket closed');
    expect(cls.kind).toBe('unknown');
    expect(cls.errorName).toBeNull();
    expect(cls.errorMessage).toBe('websocket closed');
  });
});

describe('micFallbackMessageForKind', () => {
  it('returns distinct copy only for the three actionable kinds', () => {
    expect(micFallbackMessageForKind('permission_denied')).toBe('Microphone access denied — type your answer');
    expect(micFallbackMessageForKind('no_device')).toBe('No microphone detected — type your answer');
    expect(micFallbackMessageForKind('unsupported')).toBe('Voice not supported in this browser — type your answer');
  });

  it('returns the generic line for transient kinds and for null (cause unknown)', () => {
    expect(micFallbackMessageForKind('device_busy')).toBe('Voice unavailable — type your answer');
    expect(micFallbackMessageForKind('timeout')).toBe('Voice unavailable — type your answer');
    expect(micFallbackMessageForKind('unknown')).toBe('Voice unavailable — type your answer');
    expect(micFallbackMessageForKind(null)).toBe('Voice unavailable — type your answer');
  });
});
