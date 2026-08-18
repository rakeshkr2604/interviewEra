/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const replace = vi.fn();
const refresh = vi.fn();
const verifyOtp = vi.fn();
const profileSingle = vi.fn();
let params = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh }),
  useSearchParams: () => params,
}));

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: { verifyOtp },
    from: () => ({
      select: () => ({
        eq: () => ({ single: profileSingle }),
      }),
    }),
  }),
}));

vi.mock('@/lib/auth/flags', () => ({
  isAuthV2Enabled: () => true,
}));

import { AuthConfirmClient } from './AuthConfirmClient';

describe('AuthConfirmClient campus verification', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    params = new URLSearchParams({
      token_hash: 'hashed-token',
      type: 'signup',
      next: '/college/setup?status=verified',
    });
    verifyOtp.mockResolvedValue({
      data: { user: { id: '11111111-1111-4111-8111-111111111111' } },
      error: null,
    });
    profileSingle.mockResolvedValue({ data: { plan_tier: 'free' }, error: null });
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 })),
    );
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('verifies the OTP before redirecting to authenticated campus setup', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(async () => {
      root.render(React.createElement(AuthConfirmClient));
    });

    await vi.waitFor(() => {
      expect(verifyOtp).toHaveBeenCalledWith({
        token_hash: 'hashed-token',
        type: 'signup',
      });
      expect(replace).toHaveBeenCalledWith('/college/setup?status=verified');
      expect(refresh).toHaveBeenCalled();
    });

    await act(async () => root.unmount());
  });
});
