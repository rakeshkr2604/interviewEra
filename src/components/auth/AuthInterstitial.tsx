'use client';

import { AuthBrandChipIcon } from '@/components/auth/AuthBrandChipIcon';

export function AuthInterstitial({ visible }: { visible: boolean }) {
  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 auth-fade-in motion-reduce:transition-none"
      style={{ background: 'color-mix(in srgb, var(--bg-primary) 92%, transparent)' }}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <AuthBrandChipIcon />
      <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
        Signing you in…
      </p>
      <div
        className="size-6 animate-spin rounded-full border-2 border-t-transparent motion-reduce:animate-none"
        style={{ borderColor: 'var(--accent-primary)', borderTopColor: 'transparent' }}
        aria-hidden
      />
    </div>
  );
}
