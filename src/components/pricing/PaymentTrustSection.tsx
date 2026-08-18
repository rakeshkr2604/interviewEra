import { Check } from 'lucide-react';
import { PAYMENT_TRUST_BULLETS } from '@/lib/pricing/copy';
import {
  PaymentMethodsLabel,
  paymentMethodsPlainText,
} from '@/components/pricing/PaymentMethodsLabel';

interface PaymentTrustSectionProps {
  className?: string;
}

/** Centered trust terms + accepted payment methods — plain text, no card chrome. */
export function PaymentTrustSection({ className = '' }: PaymentTrustSectionProps) {
  return (
    <div className={`mx-auto w-full max-w-lg ${className}`.trim()}>
      <ul
        className="grid justify-center gap-2 sm:grid-cols-2"
        aria-label="Payment terms"
      >
        {PAYMENT_TRUST_BULLETS.map((line) => (
          <li
            key={line}
            className="flex items-start gap-2 text-xs font-medium sm:text-sm"
            style={{ color: 'var(--text-secondary)' }}
          >
            <Check
              className="mt-0.5 size-3.5 shrink-0"
              style={{ color: 'var(--accent-success)' }}
              aria-hidden
            />
            {line}
          </li>
        ))}
      </ul>
      <p
        className="mt-3 text-center text-xs leading-relaxed"
        style={{ color: 'var(--text-muted)' }}
        aria-label={paymentMethodsPlainText()}
      >
        <PaymentMethodsLabel />
      </p>
    </div>
  );
}
