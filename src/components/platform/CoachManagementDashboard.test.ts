/** @vitest-environment jsdom */

import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

import { CoachManagementDashboard } from './CoachManagementDashboard';

describe('CoachManagementDashboard', () => {
  let container: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  let mockState: {
    mode: string;
    allowlistCount: number;
    allowlist: string[];
  };
  let fetchPostCalls: Array<{ url: string; body: Record<string, unknown> }>;

  beforeEach(() => {
    vi.clearAllMocks();
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);

    mockState = {
      mode: 'allowlist',
      allowlistCount: 2,
      allowlist: ['alice@example.com', 'bob@example.com'],
    };
    fetchPostCalls = [];

    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string, init?: RequestInit) => {
        if (!init || init.method === 'GET' || !init.method) {
          return new Response(JSON.stringify(mockState), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
          });
        }

        if (init.method === 'POST') {
          const body = JSON.parse(String(init.body)) as Record<string, unknown>;
          fetchPostCalls.push({ url, body });

          if (body.action === 'set_mode') {
            mockState.mode = String(body.mode);
            return new Response(JSON.stringify({ ok: true, mode: body.mode }), {
              status: 200,
              headers: { 'Content-Type': 'application/json' },
            });
          }

          if (body.action === 'add_emails') {
            const added = body.emails as string[];
            for (const email of added) {
              if (!mockState.allowlist.includes(email)) {
                mockState.allowlist.push(email);
              }
            }
            mockState.allowlistCount = mockState.allowlist.length;
            return new Response(
              JSON.stringify({ ok: true, added: added.length, allowlist: mockState.allowlist }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          if (body.action === 'remove_emails') {
            const removed = body.emails as string[];
            mockState.allowlist = mockState.allowlist.filter((e) => !removed.includes(e));
            mockState.allowlistCount = mockState.allowlist.length;
            return new Response(
              JSON.stringify({ ok: true, removed: removed.length, allowlist: mockState.allowlist }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }

          if (body.action === 'clear_allowlist') {
            mockState.allowlist = [];
            mockState.allowlistCount = 0;
            return new Response(
              JSON.stringify({ ok: true, allowlist: [] }),
              { status: 200, headers: { 'Content-Type': 'application/json' } }
            );
          }
        }

        return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
      })
    );
  });

  afterEach(() => {
    act(() => {
      root.unmount();
    });
    container.remove();
    vi.unstubAllGlobals();
  });

  it('renders initial state loaded from GET API', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    expect(container.textContent).toContain('AI Interview Coach');
    expect(container.textContent).toContain('Controlled access & operational management');
    expect(container.textContent).toContain('Allowlist Preview');
    expect(container.textContent).toContain('alice@example.com');
    expect(container.textContent).toContain('bob@example.com');
  });

  it('handles mode selection and requires confirmation before updating', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    // Find "Public" button in mode selector
    const publicButton = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Public') && b.textContent?.includes('All authenticated users')
    );
    expect(publicButton).toBeDefined();

    // Click to stage public mode
    await act(async () => {
      publicButton?.click();
    });

    // Dialog should appear in document.body
    expect(document.body.textContent).toContain('You are changing AI Interview Coach access.');
    expect(document.body.textContent).toContain('Public');
    expect(document.body.textContent).toContain('All authenticated users will immediately be able to access');

    // No POST API call should have been made yet
    expect(fetchPostCalls.length).toBe(0);

    // Find and click "Confirm Change"
    const confirmBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Confirm Change')
    );
    expect(confirmBtn).toBeDefined();

    await act(async () => {
      confirmBtn?.click();
    });

    // POST should have been called with set_mode: public
    expect(fetchPostCalls.length).toBe(1);
    expect(fetchPostCalls[0].body).toEqual({ action: 'set_mode', mode: 'public' });
  });

  it('cancels mode change when Cancel is clicked', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    const disabledBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Disabled') && b.textContent?.includes('Coach is unavailable')
    );

    await act(async () => {
      disabledBtn?.click();
    });

    expect(document.body.textContent).toContain('You are changing AI Interview Coach access.');

    const cancelBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Cancel')
    );
    await act(async () => {
      cancelBtn?.click();
    });

    // No POST calls
    expect(fetchPostCalls.length).toBe(0);
    expect(mockState.mode).toBe('allowlist');
  });

  function setInputValue(input: HTMLInputElement, value: string) {
    const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
      window.HTMLInputElement.prototype,
      'value'
    )?.set;
    nativeInputValueSetter?.call(input, value);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }

  it('validates email format before adding user', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    // Enter invalid email
    await act(async () => {
      setInputValue(input, 'invalid-email');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('Please enter a valid email address.');
    expect(fetchPostCalls.length).toBe(0);
  });

  it('rejects duplicate email additions', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    await act(async () => {
      setInputValue(input, 'Alice@Example.COM'); // Existing in allowlist
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(container.textContent).toContain('This email is already in the allowlist.');
    expect(fetchPostCalls.length).toBe(0);
  });

  it('adds valid normalized email to allowlist', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    const input = container.querySelector('input[type="email"]') as HTMLInputElement;
    const form = container.querySelector('form') as HTMLFormElement;

    await act(async () => {
      setInputValue(input, '  NewTester@Example.COM  ');
      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });

    expect(fetchPostCalls.length).toBe(1);
    expect(fetchPostCalls[0].body).toEqual({
      action: 'add_emails',
      emails: ['newtester@example.com'],
    });

    expect(container.textContent).toContain('newtester@example.com');
  });

  it('requires confirmation before removing an email', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    // Find the Remove button for alice@example.com
    const removeButtons = Array.from(container.querySelectorAll('button')).filter(
      (b) => b.textContent?.trim() === 'Remove'
    );
    expect(removeButtons.length).toBe(2);

    await act(async () => {
      removeButtons[0].click();
    });

    // Remove confirmation dialog
    expect(document.body.textContent).toContain('Remove this user from the Coach allowlist?');
    expect(document.body.textContent).toContain('alice@example.com');
    expect(fetchPostCalls.length).toBe(0);

    const confirmRemoveBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Remove User')
    );
    expect(confirmRemoveBtn).toBeDefined();

    await act(async () => {
      confirmRemoveBtn?.click();
    });

    expect(fetchPostCalls.length).toBe(1);
    expect(fetchPostCalls[0].body).toEqual({
      action: 'remove_emails',
      emails: ['alice@example.com'],
    });
  });

  it('requires confirmation before clearing the entire allowlist', async () => {
    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    const clearBtn = Array.from(container.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Clear Allowlist')
    );
    expect(clearBtn).toBeDefined();

    await act(async () => {
      clearBtn?.click();
    });

    expect(document.body.textContent).toContain('Clear all allowlisted users?');
    expect(document.body.textContent).toContain('Warning: High-Impact Action');
    expect(fetchPostCalls.length).toBe(0);

    const confirmClearBtn = Array.from(document.body.querySelectorAll('button')).find(
      (b) => b.textContent?.includes('Clear Entire Allowlist')
    );
    expect(confirmClearBtn).toBeDefined();

    await act(async () => {
      confirmClearBtn?.click();
    });

    expect(fetchPostCalls.length).toBe(1);
    expect(fetchPostCalls[0].body).toEqual({ action: 'clear_allowlist' });
  });

  it('renders error banner when initial load fails and allows retry', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ error: 'Network failure' }), { status: 500 }))
    );

    await act(async () => {
      root.render(React.createElement(CoachManagementDashboard));
    });

    expect(container.textContent).toContain('Network failure');
    expect(container.textContent).toContain('Retry');
  });
});
