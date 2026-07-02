import type { SessionRedirectReason } from '@/lib/auth/auth-params';

const MESSAGES: Record<SessionRedirectReason, string> = {
  session_expired: 'Your session ended. Sign in to continue where you left off.',
  session_required: 'Sign in to access this page.',
};

export function SessionBanner({ reason }: { reason: SessionRedirectReason }) {
  return (
    <div
      className="rounded-xl border-2 px-4 py-3 text-sm font-medium leading-relaxed"
      role="status"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 8%, transparent)',
        color: 'var(--text-primary)',
      }}
    >
      {MESSAGES[reason]}
    </div>
  );
}
