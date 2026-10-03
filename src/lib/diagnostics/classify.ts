/**
 * Pure classifiers for interview diagnostic event types / error codes.
 * No PII — messages are mapped to short allowlisted codes only.
 */

import type { DiagnosticEventType } from '@/lib/diagnostics/event-contract';

export type ClassifiedDiagnostic = {
  eventType: DiagnosticEventType;
  errorCode: string;
};

/** Map TTS speak/playback failure messages to request vs playback events. */
export function classifyTtsFailureMessage(message?: string | null): ClassifiedDiagnostic {
  const m = (message ?? '').toLowerCase();

  if (
    m.includes('limit reached') ||
    m.includes('service unavailable') ||
    m.includes('voice service') ||
    m.includes('429') ||
    m.includes('rate') ||
    m.includes('http')
  ) {
    if (m.includes('limit')) {
      return { eventType: 'tts_request_failed', errorCode: 'tts_rate_limited' };
    }
    return { eventType: 'tts_request_failed', errorCode: 'tts_request_failed' };
  }

  if (m.includes('blocked') || m.includes('not-allowed') || m.includes('not allowed')) {
    return { eventType: 'tts_playback_failed', errorCode: 'playback_rejected' };
  }
  if (m.includes('unavailable') || m.includes('audio context') || m.includes('voice player')) {
    return { eventType: 'tts_playback_failed', errorCode: 'audio_unavailable' };
  }
  if (m.includes('timeout')) {
    return { eventType: 'tts_playback_failed', errorCode: 'playback_timeout' };
  }
  if (m.includes('retry') || m.includes('recovery') || m.includes('fallback')) {
    return { eventType: 'tts_playback_failed', errorCode: 'playback_recovery_failed' };
  }

  return { eventType: 'tts_playback_failed', errorCode: 'playback_failed' };
}

export type TurnFailureKind = 'answer_submit' | 'question_delivery' | 'request';

/** Classify a failed /turn load relative to the request shape. */
export function classifyTurnLoadFailure(args: {
  lastAnswer: string;
  prevTurnIndex?: number;
  submittedAs?: string;
  errorMessage?: string;
}): ClassifiedDiagnostic {
  const msg = args.errorMessage ?? '';
  if (msg === 'invalid_turn_output') {
    return { eventType: 'question_delivery_failed', errorCode: 'invalid_turn_output' };
  }

  const statusMatch = /status\s+(\d{3})/i.exec(msg);
  const httpCode = statusMatch?.[1] ? `http_${statusMatch[1]}` : null;

  const isAnswerPath =
    args.submittedAs != null ||
    (args.lastAnswer !== '[NONE]' && args.prevTurnIndex != null);

  if (isAnswerPath) {
    return {
      eventType: 'answer_submit_failed',
      errorCode: httpCode ?? 'turn_submit_failed',
    };
  }

  if (args.lastAnswer === '[NONE]') {
    return {
      eventType: 'question_delivery_failed',
      errorCode: httpCode ?? 'turn_delivery_failed',
    };
  }

  return {
    eventType: 'request_failed',
    errorCode: httpCode ?? 'turn_request_failed',
  };
}

/** Sanitize exception names into short codes (never free-form stacks). */
export function classifyClientException(args: {
  name?: string | null;
  message?: string | null;
}): ClassifiedDiagnostic {
  const name = (args.name ?? '').toLowerCase();
  const message = (args.message ?? '').toLowerCase();

  if (message.includes('/api/interview/diagnostics') || message.includes('emitinterviewdiagnostic')) {
    return { eventType: 'client_exception', errorCode: 'diag_self_skip' };
  }
  if (name.includes('chunkload') || message.includes('loading chunk')) {
    return { eventType: 'client_exception', errorCode: 'chunk_load_error' };
  }
  if (name === 'typeerror') {
    return { eventType: 'client_exception', errorCode: 'type_error' };
  }
  if (name === 'referenceerror') {
    return { eventType: 'client_exception', errorCode: 'reference_error' };
  }
  if (message.includes('network') || message.includes('failed to fetch')) {
    return { eventType: 'client_exception', errorCode: 'network_error' };
  }
  return { eventType: 'client_exception', errorCode: 'runtime_exception' };
}
