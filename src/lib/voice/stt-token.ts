export interface STTTokenResponse {
  token: string;
  expires_in_seconds: number;
  interview_id: string;
  issued_at: string;
}

/**
 * Fetches a short-lived (120 s) Deepgram token from the server.
 *
 * The token is:
 * - Scoped to the authenticated user
 * - Bound to a specific active interview session
 * - Rate-limited per user AND per IP
 * - Only issued when interview.status === 'in_progress'
 *
 * Throws a user-readable Error on any failure so the caller can display it.
 */
export async function fetchSTTToken(interviewId: string): Promise<string> {
  const res = await fetch('/api/stt/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ interview_id: interviewId }),
  });

  if (res.status === 401) throw new Error('Please sign in to use voice recording.');
  if (res.status === 403) throw new Error('Voice recording is only available during an active interview.');
  if (res.status === 429) throw new Error('Too many recording sessions. Please wait a moment and try again.');
  if (res.status === 503) throw new Error('Voice recording is not available right now. Please use text mode.');
  if (!res.ok) throw new Error('Could not start voice recording. Please try again.');

  const data = (await res.json()) as STTTokenResponse;
  if (!data.token) throw new Error('Invalid response from voice service.');

  return data.token;
}
