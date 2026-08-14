export type InterviewerId = 'priya' | 'arjun';

export type Interviewer = {
  id: InterviewerId;
  name: string;
  role: string;
  avatarImage: string;
  video: string;
  voiceId: 'female_voice_id' | 'male_voice_id';
  gender: 'male' | 'female';
};

export const interviewers: Interviewer[] = [
  {
    id: 'priya',
    name: 'Meera',
    role: 'Senior Recruiter',
    avatarImage: '/avatars/female/meera-avatar.png',
    video: '/avatars/female/meera-ai.mp4',
    voiceId: 'female_voice_id',
    gender: 'female',
  },
  {
    id: 'arjun',
    name: 'Rohan',
    role: 'Technical Lead',
    avatarImage: '/avatars/male/rohan-avatar.png',
    video: '/avatars/male/rohan-ai.mp4',
    voiceId: 'male_voice_id',
    gender: 'male',
  },
];

export const INTERVIEWER_IDS = interviewers.map((item) => item.id) as [InterviewerId, ...InterviewerId[]];

export function getInterviewerById(id: string | null | undefined): Interviewer | undefined {
  if (!id) return undefined;
  return interviewers.find((item) => item.id === id);
}

function scriptInterviewerStorageKey(interviewId: string): string {
  return `ie:script-interviewer:${interviewId}`;
}

/** Persist selected interviewer before navigating to the session page. */
export function stashScriptInterviewerId(
  interviewId: string,
  interviewerId: InterviewerId,
): void {
  if (typeof window === 'undefined' || !interviewId) return;
  try {
    sessionStorage.setItem(scriptInterviewerStorageKey(interviewId), interviewerId);
  } catch {
    /* private mode / quota — avatar falls back to session fetch */
  }
}

/**
 * Read stashed interviewer for immediate avatar render before `/session` returns.
 * Never invents an id — returns null when unknown (avoid Meera/Rohan flash).
 */
export function readStashedScriptInterviewerId(
  interviewId: string,
): InterviewerId | null {
  if (typeof window === 'undefined' || !interviewId) return null;
  try {
    const raw = sessionStorage.getItem(scriptInterviewerStorageKey(interviewId));
    if (raw === 'priya' || raw === 'arjun') return raw;
  } catch {
    /* ignore */
  }
  return null;
}

/** Stash + optional `?i=` query for first paint before `/session` returns. */
export function readInitialScriptInterviewerId(
  interviewId: string,
): InterviewerId | null {
  const stashed = readStashedScriptInterviewerId(interviewId);
  if (stashed) return stashed;
  if (typeof window === 'undefined') return null;
  try {
    const q = new URLSearchParams(window.location.search).get('i');
    if (q === 'priya' || q === 'arjun') {
      stashScriptInterviewerId(interviewId, q);
      return q;
    }
  } catch {
    /* ignore */
  }
  return null;
}
