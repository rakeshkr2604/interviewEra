/**
 * Interview diagnostic event contract (schema_version 1).
 * Failure-biased, allowlisted metadata only. Not funnel analytics.
 */

export const DIAGNOSTIC_SCHEMA_VERSION = 1 as const;

export const DIAGNOSTIC_EVENT_TYPES = [
  'session_ready',
  'session_resumed',
  'mic_permission_denied',
  'mic_acquire_failed',
  'stt_connection_failed',
  'stt_timeout',
  'tts_request_failed',
  'tts_playback_failed',
  'question_delivery_failed',
  'answer_submit_failed',
  'request_failed',
  'client_exception',
  'voice_reconnect_attempt',
  'network_offline',
  'network_online',
] as const;

export type DiagnosticEventType = (typeof DIAGNOSTIC_EVENT_TYPES)[number];

export const DIAGNOSTIC_SEVERITIES = ['info', 'warning', 'error'] as const;
export type DiagnosticSeverity = (typeof DIAGNOSTIC_SEVERITIES)[number];

export const DIAGNOSTIC_SOURCES = ['client', 'server', 'edge'] as const;
export type DiagnosticSource = (typeof DIAGNOSTIC_SOURCES)[number];

export const DIAGNOSTIC_CONFIRMATIONS = ['client_reported', 'server_confirmed'] as const;
export type DiagnosticConfirmation = (typeof DIAGNOSTIC_CONFIRMATIONS)[number];

/** Allowlisted metadata keys — reject everything else. */
export const DIAGNOSTIC_METADATA_KEYS = [
  'error_code',
  'component',
  'retry_count',
  'http_status',
  'elapsed_ms',
  'browser',
  'platform',
  'network_state',
  'voice_engine',
  'phase',
  'endpoint',
  'provider',
  /** Browser DOMException / Error.name (e.g. NotAllowedError, TimeoutError). */
  'error_name',
  /** Normalized mic/STT failure kind (permission_denied, timeout, …). */
  'error_kind',
  /** Permissions API state when known (granted | denied | prompt). */
  'permission_state',
] as const;

export type DiagnosticMetadataKey = (typeof DIAGNOSTIC_METADATA_KEYS)[number];

export const DIAGNOSTIC_COMPONENTS = [
  'mic',
  'stt',
  'tts',
  'api',
  'session',
  'ui',
  'network',
  'unknown',
] as const;

export type DiagnosticComponent = (typeof DIAGNOSTIC_COMPONENTS)[number];

export const DEFAULT_SEVERITY_BY_EVENT: Record<DiagnosticEventType, DiagnosticSeverity> = {
  session_ready: 'info',
  session_resumed: 'info',
  mic_permission_denied: 'error',
  mic_acquire_failed: 'error',
  stt_connection_failed: 'error',
  stt_timeout: 'error',
  tts_request_failed: 'error',
  tts_playback_failed: 'warning',
  question_delivery_failed: 'error',
  answer_submit_failed: 'error',
  request_failed: 'error',
  client_exception: 'error',
  voice_reconnect_attempt: 'warning',
  network_offline: 'warning',
  network_online: 'info',
};

export const MAX_DIAGNOSTIC_EVENTS_PER_REQUEST = 20;
export const MAX_DIAGNOSTIC_METADATA_STRING = 80;
export const MAX_CLIENT_EVENT_ID_LEN = 80;
export const MAX_CORRELATION_ID_LEN = 80;

export function isDiagnosticEventType(value: unknown): value is DiagnosticEventType {
  return typeof value === 'string' && (DIAGNOSTIC_EVENT_TYPES as readonly string[]).includes(value);
}

export function humanLabelForDiagnosticEvent(eventType: string): string {
  const labels: Record<DiagnosticEventType, string> = {
    session_ready: 'Session ready',
    session_resumed: 'Session resumed',
    mic_permission_denied: 'Microphone permission denied',
    mic_acquire_failed: 'Microphone acquire failed',
    stt_connection_failed: 'STT connection failed',
    stt_timeout: 'STT timeout',
    tts_request_failed: 'TTS request failed',
    tts_playback_failed: 'TTS playback failed',
    question_delivery_failed: 'Question delivery failed',
    answer_submit_failed: 'Answer submission failed',
    request_failed: 'Interview API request failed',
    client_exception: 'Client runtime exception',
    voice_reconnect_attempt: 'Voice reconnect attempted',
    network_offline: 'Network offline',
    network_online: 'Network online',
  };
  return labels[eventType as DiagnosticEventType] ?? eventType;
}
