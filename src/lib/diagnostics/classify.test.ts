import { describe, expect, it } from 'vitest';
import {
  classifyClientException,
  classifyTtsFailureMessage,
  classifyTurnLoadFailure,
} from '@/lib/diagnostics/classify';

describe('classifyTtsFailureMessage', () => {
  it('separates request failures from playback failures', () => {
    expect(classifyTtsFailureMessage('Voice service unavailable right now.')).toEqual({
      eventType: 'tts_request_failed',
      errorCode: 'tts_request_failed',
    });
    expect(classifyTtsFailureMessage('Voice playback limit reached.')).toEqual({
      eventType: 'tts_request_failed',
      errorCode: 'tts_rate_limited',
    });
    expect(classifyTtsFailureMessage('Audio playback is blocked. Tap Retry Audio.')).toEqual({
      eventType: 'tts_playback_failed',
      errorCode: 'playback_rejected',
    });
    expect(classifyTtsFailureMessage('Audio context unavailable.')).toEqual({
      eventType: 'tts_playback_failed',
      errorCode: 'audio_unavailable',
    });
    expect(classifyTtsFailureMessage('playback timeout')).toEqual({
      eventType: 'tts_playback_failed',
      errorCode: 'playback_timeout',
    });
  });
});

describe('classifyTurnLoadFailure', () => {
  it('emits answer_submit_failed for answer paths only', () => {
    expect(
      classifyTurnLoadFailure({
        lastAnswer: 'my answer',
        prevTurnIndex: 2,
        submittedAs: 'raw',
        errorMessage: 'The interviewer could not respond (status 500).',
      }),
    ).toEqual({
      eventType: 'answer_submit_failed',
      errorCode: 'http_500',
    });

    expect(
      classifyTurnLoadFailure({
        lastAnswer: '[NONE]',
        errorMessage: 'invalid_turn_output',
      }),
    ).toEqual({
      eventType: 'question_delivery_failed',
      errorCode: 'invalid_turn_output',
    });
  });
});

describe('classifyClientException', () => {
  it('sanitizes to codes and skips diagnostic recursion', () => {
    expect(
      classifyClientException({
        name: 'Error',
        message: 'Failed POST /api/interview/diagnostics',
      }).errorCode,
    ).toBe('diag_self_skip');

    expect(
      classifyClientException({ name: 'TypeError', message: 'x is not a function' }),
    ).toEqual({
      eventType: 'client_exception',
      errorCode: 'type_error',
    });
  });
});
