/**
 * Mic-start failure classification (fixes TECH_DEBT M11).
 *
 * Before this module, every mic/STT start failure on the script interview page
 * logged "possible getUserMedia denial" and fell back to typed input — a real
 * permission denial (NotAllowedError), an unsupported browser/insecure context
 * (NotSupportedError), and missing hardware (NotFoundError) were
 * indistinguishable in telemetry and showed identical candidate copy.
 *
 * This is pure classification: the fallback mechanism (typed answer) is
 * unchanged for every kind. Only the log/telemetry labels and the one-line
 * fallback status copy vary.
 */

export type MicStartErrorKind =
  | 'permission_denied'
  | 'unsupported'
  | 'no_device'
  | 'device_busy'
  | 'constraint_unsatisfiable'
  | 'timeout'
  | 'aborted'
  | 'unknown';

export interface MicStartErrorClassification {
  kind: MicStartErrorKind;
  /** Original DOMException/Error name, null when the value carried none. */
  errorName: string | null;
  /** Original error message (for logging; never shown to the candidate). */
  errorMessage: string;
  /**
   * One-line status shown in the fallback answer box. Only three kinds get
   * distinct copy (denied / no mic / unsupported) — those are genuinely
   * different candidate situations with different remedies. Everything else
   * (busy device, timeouts, WS/STT failures) keeps the generic line: the
   * candidate's action is identical (type your answer), and speculative
   * detail about transient errors would be noise.
   */
  candidateMessage: string;
}

const GENERIC_FALLBACK_MESSAGE = 'Voice unavailable — type your answer';

const CANDIDATE_MESSAGES: Record<MicStartErrorKind, string> = {
  permission_denied: 'Microphone access denied — type your answer',
  no_device: 'No microphone detected — type your answer',
  unsupported: 'Voice not supported in this browser — type your answer',
  device_busy: GENERIC_FALLBACK_MESSAGE,
  constraint_unsatisfiable: GENERIC_FALLBACK_MESSAGE,
  timeout: GENERIC_FALLBACK_MESSAGE,
  aborted: GENERIC_FALLBACK_MESSAGE,
  unknown: GENERIC_FALLBACK_MESSAGE,
};

/**
 * Map a getUserMedia/mic-start error name to its kind.
 * Includes the legacy pre-spec names some browsers still emit
 * (PermissionDeniedError, DevicesNotFoundError, TrackStartError).
 */
function kindFromErrorName(name: string): MicStartErrorKind {
  switch (name) {
    case 'NotAllowedError':
    case 'PermissionDeniedError':
    case 'SecurityError':
      return 'permission_denied';
    case 'NotSupportedError':
      return 'unsupported';
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no_device';
    case 'NotReadableError':
    case 'TrackStartError':
      return 'device_busy';
    case 'OverconstrainedError':
    case 'ConstraintNotSatisfiedError':
      return 'constraint_unsatisfiable';
    case 'TimeoutError':
      return 'timeout';
    case 'AbortError':
      return 'aborted';
    default:
      return 'unknown';
  }
}

export function classifyMicStartError(err: unknown): MicStartErrorClassification {
  let errorName: string | null = null;
  let errorMessage: string;

  if (err instanceof Error) {
    // DOMException extends Error; .name carries the getUserMedia error type.
    errorName = err.name || null;
    errorMessage = err.message;
  } else {
    errorMessage = String(err);
  }

  const kind = errorName ? kindFromErrorName(errorName) : 'unknown';

  return {
    kind,
    errorName,
    errorMessage,
    candidateMessage: CANDIDATE_MESSAGES[kind],
  };
}

/** Fallback status copy for a known kind without a captured error object. */
export function micFallbackMessageForKind(kind: MicStartErrorKind | null): string {
  return kind ? CANDIDATE_MESSAGES[kind] : GENERIC_FALLBACK_MESSAGE;
}
