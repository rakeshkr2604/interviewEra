import { PAYMENT_METHOD_KEYWORDS } from '@/lib/pricing/copy';

interface PaymentMethodsLabelProps {
  variant?: 'dashboard' | 'marketing';
}

function joinMethods(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;
}

export function PaymentMethodsLabel({ variant = 'dashboard' }: PaymentMethodsLabelProps) {
  const highlightStyle =
    variant === 'marketing'
      ? { fontWeight: 600 as const, color: 'var(--accent-primary)' }
      : undefined;

  const highlightClass =
    variant === 'dashboard'
      ? 'font-semibold text-[var(--accent-primary)]'
      : undefined;

  return (
    <span>
      Supports{' '}
      {PAYMENT_METHOD_KEYWORDS.map((method, index) => (
        <span key={method}>
          {index > 0 && (index === PAYMENT_METHOD_KEYWORDS.length - 1 ? ' & ' : ', ')}
          <span className={highlightClass} style={highlightStyle}>
            {method}
          </span>
        </span>
      ))}
    </span>
  );
}

/** Plain string for aria-label / SEO (no markup) */
export function paymentMethodsPlainText(): string {
  return `Supports ${joinMethods(PAYMENT_METHOD_KEYWORDS)}`;
}
