'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { StreamingSTT } from '@/lib/voice/stt-client';
import { fetchSTTToken } from '@/lib/voice/stt-token';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useVoicePlayer } from '@/hooks/useVoicePlayer';
import type { VoiceMetadata } from '@/lib/interview/interview-orchestrator';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceInterviewSessionProps {
  interviewId: string;
  currentQuestion: string;
  onAnswerComplete: (answer: string) => void;
  // When provided, speaks the question text through ElevenLabs with the
  // tone appropriate for the current rapport level.
  voiceMetadata?: VoiceMetadata;
}

// Standalone voice-input panel: streams Deepgram Nova-3 transcripts in
// real-time and calls onAnswerComplete when VAD detects end-of-utterance.
// If voiceMetadata is passed, the question is also read aloud via ElevenLabs
// with an emotionally-adapted tone (encouraging / neutral / challenging).
export function VoiceInterviewSession({
  interviewId,
  currentQuestion,
  onAnswerComplete,
  voiceMetadata,
}: VoiceInterviewSessionProps) {
  const [partialTranscript, setPartialTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);
  const sttRef = useRef<StreamingSTT | null>(null);
  const micCleanupRef = useRef<(() => void) | null>(null);
  const { isRecording, startRecording, stopRecording } = useMicrophone();
  const { isPlaying: interviewerSpeaking, speak: speakQuestion } = useVoicePlayer('female');

  // STT client is created per-session in handleStartListening so that each
  // session uses a fresh server-issued ephemeral token (never the master key).

  // Speak the question whenever voiceMetadata says to
  useEffect(() => {
    if (!voiceMetadata?.shouldUseVoice || !currentQuestion) return;
    void speakQuestion(currentQuestion, voiceMetadata.tone);
    // currentQuestion + voiceMetadata changes drive this — speakQuestion is stable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, voiceMetadata]);

  const handleStartListening = useCallback(async () => {
    setSttError(null);
    setPartialTranscript('');
    setFullTranscript('');

    let token: string;
    try {
      token = await fetchSTTToken(interviewId);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to start voice recording.';
      setSttError(msg);
      return;
    }

    // Stop any previous session before starting a new one
    sttRef.current?.stop();
    sttRef.current = new StreamingSTT(token);

    await sttRef.current.start({
      onPartial: (chunk) => {
        if (chunk.isFinal) {
          setFullTranscript((prev) => prev + chunk.text + ' ');
          setPartialTranscript('');
        } else {
          setPartialTranscript(chunk.text);
        }
      },
      onFinal: (answer) => {
        setFullTranscript(answer);
        setPartialTranscript('');
        stopRecording();
        onAnswerComplete(answer);
      },
      onError: (err) => {
        console.error('[VoiceInterviewSession] STT error:', err);
        setSttError(err.message);
        stopRecording();
      },
    });

    const cleanup = await startRecording((audioData) => {
      sttRef.current?.sendAudio(audioData);
    });
    micCleanupRef.current = cleanup;
  }, [startRecording, stopRecording, onAnswerComplete, interviewId]);

  const handleStopListening = useCallback(() => {
    sttRef.current?.stop();
    micCleanupRef.current?.();
    micCleanupRef.current = null;
    stopRecording();
  }, [stopRecording]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      sttRef.current?.stop();
      micCleanupRef.current?.();
    };
  }, []);

  const displayText = fullTranscript + partialTranscript;

  const toneLabel: Record<string, string> = {
    encouraging: 'Warm & Encouraging',
    neutral: 'Professional',
    challenging: 'Assertive',
  };

  return (
    <div className="space-y-6">
      {/* Question — with speaking indicator */}
      <div className="rounded-xl border border-(--card-border) bg-(--card-bg) p-6">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
            Current Question
          </h3>
          {interviewerSpeaking && (
            <span className="flex items-center gap-1 rounded-full bg-(--accent-primary)/12 px-2 py-0.5 text-[10px] font-semibold text-(--accent-primary)">
              <Volume2 className="h-3 w-3 animate-pulse" />
              Speaking
            </span>
          )}
          {voiceMetadata && !interviewerSpeaking && (
            <span className="rounded-full bg-(--bg-secondary) px-2 py-0.5 text-[10px] text-(--text-muted)">
              {toneLabel[voiceMetadata.tone] ?? voiceMetadata.tone}
            </span>
          )}
        </div>
        <p className="text-base leading-relaxed text-(--text-primary)">{currentQuestion}</p>
      </div>

      {/* Live transcript */}
      <div className="min-h-32 rounded-xl border border-(--card-border) bg-(--card-bg) p-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
          {isRecording ? 'Live transcript' : 'Your Answer'}
        </h4>
        {displayText ? (
          <p className="text-sm leading-relaxed text-(--text-primary)">
            {fullTranscript}
            {partialTranscript && (
              <span className="italic text-(--text-secondary)"> {partialTranscript}</span>
            )}
          </p>
        ) : (
          <p className="text-sm text-(--text-muted)">
            {isRecording ? 'Listening…' : 'Tap the mic to start speaking.'}
          </p>
        )}
      </div>

      {sttError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sttError}</p>
      )}

      {/* Mic toggle */}
      <div className="flex justify-center">
        {!isRecording ? (
          <button
            type="button"
            onClick={() => void handleStartListening()}
            disabled={interviewerSpeaking}
            className="flex items-center gap-2 rounded-xl bg-(--accent-primary) px-6 py-3
                       text-sm font-semibold text-white transition-colors
                       hover:bg-(--accent-hover) disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Mic className="h-5 w-5" />
            {interviewerSpeaking ? 'Wait for interviewer…' : 'Start Speaking'}
          </button>
        ) : (
          <button
            type="button"
            onClick={handleStopListening}
            className="flex items-center gap-2 rounded-xl border border-red-400 bg-red-50
                       px-6 py-3 text-sm font-semibold text-red-600 transition-colors
                       hover:bg-red-100"
          >
            <MicOff className="h-5 w-5" />
            Stop Recording
          </button>
        )}
      </div>
    </div>
  );
}
