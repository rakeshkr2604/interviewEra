import { PAYMENT_METHOD_KEYWORDS } from '@/lib/pricing/copy';

function joinMethods(items: readonly string[]): string {
  if (items.length <= 1) return items[0] ?? '';
  if (items.length === 2) return `${items[0]} & ${items[1]}`;
  return `${items.slice(0, -1).join(', ')} & ${items[items.length - 1]}`;
}

/** Plain string for aria-label (no markup) */
export function paymentMethodsPlainText(): string {
  return `Supports ${joinMethods(PAYMENT_METHOD_KEYWORDS)}`;
}

export function PaymentMethodsLabel() {
  return (
    <span>
      Supports{' '}
      {PAYMENT_METHOD_KEYWORDS.map((method, index) => (
        <span key={method}>
          {index > 0 && (index === PAYMENT_METHOD_KEYWORDS.length - 1 ? ' & ' : ', ')}
          <span className="font-semibold text-[var(--accent-primary)]">{method}</span>
        </span>
      ))}
    </span>
  );
}
