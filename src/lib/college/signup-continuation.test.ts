import { describe, expect, it, vi } from 'vitest';
import {
  CAMPUS_SETUP_PATH,
  CAMPUS_SIGNUP_DRAFT_KEY,
  campusVerificationPendingPath,
  clearCampusSignupDraft,
  readCampusSignupDraft,
  saveCampusSignupDraft,
} from './signup-continuation';

function storage() {
  const values = new Map<string, string>();
  return {
    getItem: vi.fn((key: string) => values.get(key) ?? null),
    setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    removeItem: vi.fn((key: string) => values.delete(key)),
  };
}

describe('campus signup continuation', () => {
  it('preserves only non-sensitive organization setup fields', () => {
    const store = storage();
    saveCampusSignupDraft(
      { collegeName: 'Example Institute', studentCount: 120 },
      store,
    );

    expect(store.setItem).toHaveBeenCalledWith(
      CAMPUS_SIGNUP_DRAFT_KEY,
      JSON.stringify({ collegeName: 'Example Institute', studentCount: 120 }),
    );
    expect(readCampusSignupDraft(store)).toEqual({
      collegeName: 'Example Institute',
      studentCount: 120,
    });

    clearCampusSignupDraft(store);
    expect(readCampusSignupDraft(store)).toBeNull();
  });

  it('degrades safely when browser storage is unavailable or malformed', () => {
    expect(readCampusSignupDraft(null)).toBeNull();
    expect(() =>
      saveCampusSignupDraft({ collegeName: 'Example Institute', studentCount: 120 }, null),
    ).not.toThrow();

    const store = storage();
    store.setItem(CAMPUS_SIGNUP_DRAFT_KEY, '{"collegeName":"x","studentCount":0}');
    expect(readCampusSignupDraft(store)).toBeNull();
  });

  it('builds a verification destination that resumes authenticated campus setup', () => {
    const path = campusVerificationPendingPath('admin+campus@example.edu');
    const url = new URL(path, 'http://localhost');

    expect(url.pathname).toBe('/auth/verify-pending');
    expect(url.searchParams.get('email')).toBe('admin+campus@example.edu');
    expect(url.searchParams.get('intent')).toBe('college');
    expect(url.searchParams.get('status')).toBe('verification_required');
    expect(url.searchParams.get('next')).toBe(CAMPUS_SETUP_PATH);
  });
});
