export type InterviewerVoice = 'male' | 'female';
export type InterviewerTone = 'encouraging' | 'neutral' | 'challenging';

export interface TTSOptions {
  voice: InterviewerVoice;
  tone: InterviewerTone;
}

// ProsodicTTS: routes through /api/tts (server-side proxy) to avoid CORS and
// keep the ElevenLabs API key server-only (no NEXT_PUBLIC_ exposure).
export class ProsodicTTS {
  // apiKey is accepted for interface compatibility but unused — auth is handled
  // server-side by the proxy route which reads ELEVENLABS_API_KEY.
  constructor(_apiKey?: string) {}

  async speak(text: string, options: TTSOptions): Promise<ArrayBuffer> {
    console.log('[TTS] Requesting via proxy:', {
      voice: options.voice,
      tone: options.tone,
      textLen: text.length,
    });

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: options.voice, tone: options.tone }),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => response.statusText);
      console.error('[TTS] Proxy error:', response.status, body);
      throw new Error(`TTS failed (${response.status}): ${body}`);
    }

    console.log('[TTS] ✓ Successfully received audio');
    return response.arrayBuffer();
  }
}
