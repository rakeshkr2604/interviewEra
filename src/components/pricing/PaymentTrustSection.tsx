import { Check } from 'lucide-react';
import { PAYMENT_TRUST_BULLETS } from '@/lib/pricing/copy';
import { PaymentMethodsLabel, paymentMethodsPlainText } from '@/components/pricing/PaymentMethodsLabel';

interface PaymentTrustSectionProps {
  className?: string;
  /** `dashboard` uses CSS vars; `marketing` uses inline styles on public pricing */
  variant?: 'dashboard' | 'marketing';
}

function TrustBullet({ line, variant }: { line: string; variant: 'dashboard' | 'marketing' }) {
  if (variant === 'marketing') {
    return (
      <li style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
        <Check
          style={{ width: 16, height: 16, marginTop: 2, flexShrink: 0, color: 'var(--accent-success)' }}
          aria-hidden
        />
        {line}
      </li>
    );
  }
  return (
    <li className="flex items-start gap-2">
      <Check
        className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
        aria-hidden
      />
      {line}
    </li>
  );
}

export function PaymentTrustSection({
  className = '',
  variant = 'dashboard',
}: PaymentTrustSectionProps) {
  if (variant === 'marketing') {
    return (
      <div className={className} style={{ maxWidth: 440, margin: '24px auto 0' }}>
        <ul
          style={{
            display: 'grid',
            gap: 10,
            padding: 0,
            listStyle: 'none',
            fontSize: 14,
            color: 'var(--text-secondary)',
          }}
        >
          {PAYMENT_TRUST_BULLETS.map((line) => (
            <TrustBullet key={line} line={line} variant="marketing" />
          ))}
        </ul>
        <p
          style={{
            marginTop: 12,
            fontSize: 12,
            lineHeight: 1.6,
            textAlign: 'center',
            color: 'var(--text-muted)',
          }}
          aria-label={paymentMethodsPlainText()}
        >
          <PaymentMethodsLabel variant="marketing" />
        </p>
      </div>
    );
  }

  return (
    <div className={`mx-auto w-full max-w-lg ${className}`.trim()}>
      <ul
        className="grid gap-2 text-sm sm:grid-cols-2"
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Payment terms"
      >
        {PAYMENT_TRUST_BULLETS.map((line) => (
          <TrustBullet key={line} line={line} variant="dashboard" />
        ))}
      </ul>
      <p
        className="mt-3 text-center text-xs leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
        aria-label={paymentMethodsPlainText()}
      >
        <PaymentMethodsLabel variant="dashboard" />
      </p>
    </div>
  );
}
