'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useMicrophone } from '@/hooks/useMicrophone';
import { useVoicePlayer } from '@/hooks/useVoicePlayer';
import type { VoiceMetadata } from '@/lib/interview/interview-orchestrator';
import { DeepgramSessionController } from '@/lib/voice/deepgram-session-controller';
import { Mic, MicOff, Volume2 } from 'lucide-react';

interface VoiceInterviewSessionProps {
  interviewId: string;
  currentQuestion: string;
  onAnswerComplete: (answer: string) => void;
  voiceMetadata?: VoiceMetadata;
}

const noopTrack = () => {};

export function VoiceInterviewSession({
  interviewId,
  currentQuestion,
  onAnswerComplete,
  voiceMetadata,
}: VoiceInterviewSessionProps) {
  const [partialTranscript, setPartialTranscript] = useState('');
  const [fullTranscript, setFullTranscript] = useState('');
  const [sttError, setSttError] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const controllerRef = useRef<DeepgramSessionController | null>(null);
  const mountedRef = useRef(true);
  const { startRecording, stopRecording } = useMicrophone();
  const { isPlaying: interviewerSpeaking, speak: speakQuestion } = useVoicePlayer('priya');

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.stop();
      controllerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!voiceMetadata?.shouldUseVoice || !currentQuestion) return;
    void speakQuestion(currentQuestion, voiceMetadata.tone);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentQuestion, voiceMetadata]);

  const ensureController = useCallback(() => {
    if (controllerRef.current) return controllerRef.current;

    controllerRef.current = new DeepgramSessionController(
      interviewId,
      { interviewId, questionIndex: 0, phase: 'candidate_answering' },
      noopTrack,
      {
        onPartial: (chunk) => {
          if (!mountedRef.current) return;
          if (chunk.isFinal) {
            setFullTranscript((prev) => prev + chunk.text + ' ');
            setPartialTranscript('');
          } else {
            setPartialTranscript(chunk.text);
          }
        },
        onFinal: (answer) => {
          if (!mountedRef.current) return;
          setFullTranscript(answer);
          setPartialTranscript('');
          setIsListening(false);
          controllerRef.current?.stop();
          onAnswerComplete(answer);
        },
        onWsOpen: () => {
          if (mountedRef.current) setIsListening(true);
        },
        onRefreshRestart: () => {
          void controllerRef.current?.start({ preserveTranscript: true, isRefresh: true });
        },
        onUiState: () => {},
        onFatalError: (message) => {
          if (!mountedRef.current) return;
          setSttError(message);
          setIsListening(false);
        },
        isMounted: () => mountedRef.current,
        startMic: startRecording,
        stopMic: stopRecording,
        releaseAudio: async () => {},
      },
    );
    return controllerRef.current;
  }, [interviewId, onAnswerComplete, startRecording, stopRecording]);

  const handleStartListening = useCallback(async () => {
    setSttError(null);
    setPartialTranscript('');
    setFullTranscript('');
    const controller = ensureController();
    await controller.start();
  }, [ensureController]);

  const handleStopListening = useCallback(() => {
    controllerRef.current?.stop();
    setIsListening(false);
  }, []);

  const displayText = fullTranscript + partialTranscript;

  const toneLabel: Record<string, string> = {
    encouraging: 'Warm & Encouraging',
    neutral: 'Professional',
    challenging: 'Assertive',
  };

  return (
    <div className="space-y-6">
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

      <div className="min-h-32 rounded-xl border border-(--card-border) bg-(--card-bg) p-6">
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-widest text-(--text-muted)">
          {isListening ? 'Live transcript' : 'Your Answer'}
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
            {isListening ? 'Listening…' : 'Tap the mic to start speaking.'}
          </p>
        )}
      </div>

      {sttError && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{sttError}</p>
      )}

      <div className="flex justify-center">
        {!isListening ? (
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
