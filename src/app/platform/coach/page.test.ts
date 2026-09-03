import { beforeEach, describe, expect, it, vi } from 'vitest';

let mockUser: { id: string; email: string } | null = null;
let mockIsAdmin = false;
let mockRedirectPath: string | null = null;

vi.mock('next/navigation', () => ({
  redirect: vi.fn((path: string) => {
    mockRedirectPath = path;
    throw new Error(`REDIRECT:${path}`);
  }),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: mockUser },
        error: null,
      })),
    },
  })),
}));

vi.mock('@/lib/admin/auth', () => ({
  isPlatformAdminUser: vi.fn(async () => mockIsAdmin),
}));

vi.mock('@/components/layout/PlatformChrome', () => ({
  PlatformChrome: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/components/platform/CoachManagementDashboard', () => ({
  CoachManagementDashboard: () => 'CoachManagementDashboardMock',
}));

import PlatformLayout from '../layout';
import PlatformCoachPage from './page';

describe('/platform/coach route & layout authorization', () => {
  beforeEach(() => {
    mockUser = null;
    mockIsAdmin = false;
    mockRedirectPath = null;
    vi.clearAllMocks();
  });

  it('redirects unauthenticated user to login', async () => {
    mockUser = null;
    mockIsAdmin = false;

    await expect(PlatformLayout({ children: PlatformCoachPage() })).rejects.toThrow(
      'REDIRECT:/login?next=/platform/analytics'
    );
    expect(mockRedirectPath).toBe('/login?next=/platform/analytics');
  });

  it('redirects authenticated non-platform-admin to /dashboard', async () => {
    mockUser = { id: 'user-1', email: 'regular@example.com' };
    mockIsAdmin = false;

    await expect(PlatformLayout({ children: PlatformCoachPage() })).rejects.toThrow(
      'REDIRECT:/dashboard'
    );
    expect(mockRedirectPath).toBe('/dashboard');
  });

  it('allows platform admin to access and render CoachManagementDashboard', async () => {
    mockUser = { id: 'admin-1', email: 'rakesh.kr2604@gmail.com' };
    mockIsAdmin = true;

    const res = await PlatformLayout({ children: PlatformCoachPage() });
    expect(res).toBeDefined();
    expect(mockRedirectPath).toBeNull();
  });
});
