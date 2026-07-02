/** Shared ElevenLabs config helpers (safe for client and server). */

/** Resolve and validate the server-side ElevenLabs API key. */
export function resolveElevenLabsApiKey(): string | null {
  const key = process.env.ELEVENLABS_API_KEY?.trim();
  if (!key || key.startsWith('your_') || key.length < 20) return null;
  return key;
}
