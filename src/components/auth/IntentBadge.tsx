import type { AuthIntent } from '@/lib/auth/auth-intent';

const LABELS: Record<Exclude<AuthIntent, 'candidate'>, string> = {
  college: 'Campus workspace setup',
  business: 'Hiring workspace setup',
};

export function IntentBadge({ intent }: { intent: Exclude<AuthIntent, 'candidate'> }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium tracking-wide"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
        color: 'var(--text-primary)',
      }}
    >
      {LABELS[intent]}
    </span>
  );
}
