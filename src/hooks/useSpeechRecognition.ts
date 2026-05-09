'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { getMicAudioConstraints } from '@/lib/settings/client-preferences';

// Minimal Web Speech API typings (not present in all TS DOM lib versions)
interface SpeechRecognitionResult {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}
interface SpeechRecognitionResultList {
  readonly length: number;
  readonly [index: number]: SpeechRecognitionResult;
}
interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}
interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
interface SpeechRecognitionConstructor {
  new(): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export interface UseSpeechRecognitionReturn {
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  isSupported: boolean;
  error: string | null;
  permissionState: 'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting';
  startListening: () => Promise<boolean>;
  retryPermission: () => Promise<boolean>;
  stopListening: () => void;
  resetTranscript: () => void;
}

const AUTO_STOP_MS = 30_000;

export function useSpeechRecognition(): UseSpeechRecognitionReturn {
  const [isSupported] = useState(
    () => typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window)
  );
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState<string | null>(
    () => (typeof window !== 'undefined' &&
      ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window))
      ? null
      : 'Speech recognition not supported in this browser. Use Chrome or Edge.'
  );
  const [permissionState, setPermissionState] = useState<'unknown' | 'granted' | 'prompt' | 'denied' | 'requesting'>('unknown');
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasRequestedMicRef = useRef(false);

  const requestMicPermission = useCallback(async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) {
      setPermissionState('denied');
      setError('Microphone is not available in this browser.');
      return false;
    }

    setPermissionState('requesting');
    hasRequestedMicRef.current = true;
    try {
      const stream = await navigator.mediaDevices.getUserMedia(getMicAudioConstraints());
      stream.getTracks().forEach((track) => track.stop());
      setPermissionState('granted');
      return true;
    } catch (err: unknown) {
      const message = err instanceof Error ? `${err.name}: ${err.message}` : 'Unknown error';
      console.error('[speech] getUserMedia failed:', message);

      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setPermissionState('denied');
        setError('Microphone permission denied. Click Retry to request again.');
        return false;
      }

      if (err instanceof DOMException && err.name === 'NotFoundError') {
        setPermissionState('denied');
        setError('No microphone device found. Please connect a mic and try again.');
        return false;
      }

      if (err instanceof DOMException && err.name === 'NotReadableError') {
        setPermissionState('prompt');
        setError('Microphone is busy in another app. Close other apps and retry.');
        return false;
      }

      setPermissionState('prompt');
      setError('Unable to access microphone right now. Please retry.');
      return false;
    }
  }, []);

  const getPermissionState = useCallback(async (): Promise<'granted' | 'prompt' | 'denied' | 'unknown'> => {
    if (!navigator?.permissions?.query) return 'unknown';
    try {
      const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
      if (permission.state === 'granted' || permission.state === 'prompt' || permission.state === 'denied') {
        return permission.state;
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }, []);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    if (autoStopRef.current) {
      clearTimeout(autoStopRef.current);
      autoStopRef.current = null;
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const startListening = useCallback(async (): Promise<boolean> => {
    if (!isSupported) return false;
    setError(null);
    setTranscript('');
    setInterimTranscript('');

    const knownPermissionState = await getPermissionState();
    if (knownPermissionState === 'denied') {
      setPermissionState('denied');
      setError('Microphone permission denied. Click Retry to request again.');
    }

    // Ensure first click always triggers browser permission popup when needed.
    if (knownPermissionState !== 'granted' || !hasRequestedMicRef.current) {
      const granted = await requestMicPermission();
      hasRequestedMicRef.current = true;
      if (!granted) {
        setError('Microphone still blocked');
        return false;
      }
    } else {
      setPermissionState('granted');
    }

    const Cls = window.SpeechRecognition ?? window.webkitSpeechRecognition;
    if (!Cls) return false;

    const recognition = new Cls();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';

    recognition.onstart = () => {
      setIsListening(true);
      autoStopRef.current = setTimeout(() => recognition.stop(), AUTO_STOP_MS);
    };

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalChunk = '';
      let interimChunk = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) finalChunk += r[0].transcript;
        else interimChunk += r[0].transcript;
      }
      if (finalChunk) setTranscript((prev) => prev + finalChunk);
      setInterimTranscript(interimChunk);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('[speech] Recognition error:', event.error);

      if (event.error === 'no-speech') {
        recognition.stop();
        return;
      }
      if (event.error === 'aborted') return;

      const messages: Record<string, string> = {
        'not-allowed': 'Microphone permission denied',
        'audio-capture': 'No microphone detected. Please connect a microphone and try again.',
        'network': 'Speech recognition requires an internet connection.',
        'service-not-allowed': 'Speech service unavailable. Try Chrome or Edge.',
      };
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setPermissionState('denied');
      }
      setError(messages[event.error] ?? `Microphone error (${event.error}). Please check permissions and try again.`);
    };

    recognition.onend = () => {
      setIsListening(false);
      setInterimTranscript('');
      if (autoStopRef.current) {
        clearTimeout(autoStopRef.current);
        autoStopRef.current = null;
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    return true;
  }, [isSupported, getPermissionState, requestMicPermission]);

  const retryPermission = useCallback(async (): Promise<boolean> => {
    setError(null);
    const granted = await requestMicPermission();
    if (!granted) {
      setError('Microphone still blocked');
      return false;
    }
    return startListening();
  }, [requestMicPermission, startListening]);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
  }, []);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      if (autoStopRef.current) clearTimeout(autoStopRef.current);
    };
  }, []);

  return {
    isListening,
    transcript,
    interimTranscript,
    isSupported,
    error,
    permissionState,
    startListening,
    retryPermission,
    stopListening,
    resetTranscript,
  };
}
