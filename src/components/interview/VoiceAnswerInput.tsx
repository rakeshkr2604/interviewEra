'use client';

import { useState, useEffect } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { useSpeechRecognition } from '@/hooks/useSpeechRecognition';
import type { AnswerMode } from '@/types/app.types';

interface VoiceAnswerInputProps {
  onSubmit: (answerText: string, answerMode: AnswerMode) => Promise<void>;
  isSubmitting: boolean;
  minChars?: number;
}

function formatTimer(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function VoiceAnswerInput({
  onSubmit,
  isSubmitting,
  minChars = 50,
}: VoiceAnswerInputProps) {
  const [mode, setMode] = useState<'text' | 'voice'>('text');
  const [textValue, setTextValue] = useState('');
  const [voiceValue, setVoiceValue] = useState('');
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error: speechError,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition();

  // Keep transcript textarea in sync while recording.
  // Conditional setState is intentional — only updates when there is content.
  useEffect(() => {
    if (!isListening && !transcript && !interimTranscript) return;
    const combined = [transcript, interimTranscript].filter(Boolean).join(' ').trim();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (combined) setVoiceValue(combined);
  }, [transcript, interimTranscript, isListening]);

  // Recording duration timer. setRecordingSeconds(0) on !isListening is a
  // deliberate reset, not a cascading render — the condition prevents re-firing.
  useEffect(() => {
    if (!isListening) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRecordingSeconds(0);
      return;
    }
    const interval = setInterval(() => setRecordingSeconds((s) => s + 1), 1000);
    return () => clearInterval(interval);
  }, [isListening]);

  function switchToVoice() {
    if (!isSupported) return; // banner already shown
    if (isListening) stopListening();
    setMode('voice');
    setVoiceValue('');
    resetTranscript();
  }

  function switchToText() {
    if (isListening) stopListening();
    setMode('text');
  }

  async function handleTextSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (textValue.trim().length < minChars || isSubmitting) return;
    await onSubmit(textValue.trim(), 'text');
  }

  async function handleVoiceSubmit() {
    if (isListening) stopListening();
    const answer = voiceValue.trim();
    if (!answer || isSubmitting) return;
    await onSubmit(answer, 'voice');
  }

  const textCharCount = textValue.length;
  const textTooShort = textCharCount < minChars;
  const voiceTooShort = voiceValue.trim().length < minChars;

  return (
    <div className="space-y-3">
      {/* Mode tab switcher */}
      <div className="flex w-fit rounded-lg border p-1 gap-1">
        <button
          type="button"
          onClick={switchToText}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Text
        </button>
        <button
          type="button"
          onClick={switchToVoice}
          disabled={!isSupported}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
            mode === 'voice'
              ? 'bg-primary text-primary-foreground'
              : !isSupported
                ? 'cursor-not-allowed text-muted-foreground/40'
                : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Voice
        </button>
      </div>

      {/* Browser support banner */}
      {!isSupported && (
        <div className="rounded-lg bg-yellow-50 p-3 text-sm text-yellow-800">
          Voice mode isn&apos;t supported in this browser. Using text mode instead.
        </div>
      )}

      {mode === 'text' ? (
        /* ── Text mode ── */
        <form onSubmit={handleTextSubmit} className="space-y-3">
          <Textarea
            placeholder="Think about specific examples from your experience..."
            value={textValue}
            onChange={(e) => setTextValue(e.target.value)}
            rows={6}
            disabled={isSubmitting}
            className="resize-none"
          />
          <div className="flex items-center justify-between">
            <span
              className={`text-xs ${
                textCharCount === 0
                  ? 'text-muted-foreground'
                  : textTooShort
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {textCharCount} chars
              {textTooShort && textCharCount > 0
                ? ` (${minChars - textCharCount} more recommended)`
                : ''}
            </span>
            <Button type="submit" disabled={textTooShort || isSubmitting}>
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                'Submit Answer →'
              )}
            </Button>
          </div>
        </form>
      ) : (
        /* ── Voice mode ── */
        <div className="space-y-4">
          {/* Mic button */}
          <div className="flex flex-col items-center gap-3 py-4">
            <button
              type="button"
              onClick={isListening ? stopListening : startListening}
              disabled={isSubmitting}
              aria-label={isListening ? 'Stop recording' : 'Start recording'}
              className={`relative flex h-20 w-20 items-center justify-center rounded-full border-4 transition-colors ${
                isListening
                  ? 'border-red-400 bg-red-50 text-red-600'
                  : 'border-primary bg-primary/10 text-primary hover:bg-primary/20'
              }`}
            >
              {isListening && (
                <span className="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-20" />
              )}
              {/* Microphone icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="h-8 w-8"
              >
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                <path d="M19 10v2a7 7 0 0 1-14 0v-2H3v2a9 9 0 0 0 8 8.94V23h2v-2.06A9 9 0 0 0 21 12v-2h-2z" />
              </svg>
            </button>
            <p className="text-sm font-medium text-muted-foreground">
              {isListening
                ? `Recording... ${formatTimer(recordingSeconds)}`
                : 'Tap mic to start'}
            </p>
          </div>

          {speechError && (
            <p className="text-sm text-destructive">{speechError}</p>
          )}

          {/* Editable transcript */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {isListening ? 'Live transcript (editable)' : 'Your answer'}
            </p>
            <Textarea
              placeholder={
                isListening
                  ? 'Listening...'
                  : 'Start recording to see your answer here. You can also type to edit.'
              }
              value={voiceValue}
              onChange={(e) => setVoiceValue(e.target.value)}
              rows={5}
              disabled={isSubmitting}
              className="resize-none"
            />
            <span
              className={`text-xs ${
                voiceValue.length === 0
                  ? 'text-muted-foreground'
                  : voiceTooShort
                    ? 'text-yellow-600'
                    : 'text-green-600'
              }`}
            >
              {voiceValue.length} chars
              {voiceTooShort && voiceValue.length > 0
                ? ` (${minChars - voiceValue.trim().length} more recommended)`
                : ''}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                resetTranscript();
                setVoiceValue('');
              }}
              disabled={isSubmitting || isListening}
            >
              Reset
            </Button>
            <Button
              type="button"
              onClick={handleVoiceSubmit}
              disabled={voiceTooShort || isSubmitting}
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                'Use this answer →'
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
