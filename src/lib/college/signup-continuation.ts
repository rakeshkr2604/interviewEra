import { z } from 'zod';

export const CAMPUS_SETUP_PATH = '/college/setup?status=verified';
export const CAMPUS_SIGNUP_DRAFT_KEY = 'ie-campus-signup-draft-v1';

const campusSignupDraftSchema = z.object({
  collegeName: z.string().trim().min(1).max(160),
  studentCount: z.number().int().min(1).max(100_000),
});

export type CampusSignupDraft = z.infer<typeof campusSignupDraftSchema>;

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function browserSessionStorage(): StorageLike | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveCampusSignupDraft(
  draft: CampusSignupDraft,
  storage: StorageLike | null = browserSessionStorage(),
): void {
  if (!storage) return;
  const parsed = campusSignupDraftSchema.safeParse(draft);
  if (!parsed.success) return;
  try {
    storage.setItem(CAMPUS_SIGNUP_DRAFT_KEY, JSON.stringify(parsed.data));
  } catch {
    // Optional UX only. Re-entering the setup form remains the correctness path.
  }
}

export function readCampusSignupDraft(
  storage: StorageLike | null = browserSessionStorage(),
): CampusSignupDraft | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(CAMPUS_SIGNUP_DRAFT_KEY);
    if (!raw) return null;
    const parsed = campusSignupDraftSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function clearCampusSignupDraft(
  storage: StorageLike | null = browserSessionStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(CAMPUS_SIGNUP_DRAFT_KEY);
  } catch {
    // Optional UX only.
  }
}

export function campusVerificationPendingPath(email: string): string {
  const params = new URLSearchParams({
    email,
    intent: 'college',
    status: 'verification_required',
    next: CAMPUS_SETUP_PATH,
  });
  return `/auth/verify-pending?${params.toString()}`;
}
