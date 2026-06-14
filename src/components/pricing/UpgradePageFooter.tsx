import { ShieldCheck } from 'lucide-react';
import { UPGRADE_PAGE_FOOTER } from '@/lib/pricing/copy';

interface UpgradePageFooterProps {
  className?: string;
  /** Marketing pricing page uses inline layout tweaks */
  variant?: 'dashboard' | 'marketing';
}

export function UpgradePageFooter({ className = '', variant = 'dashboard' }: UpgradePageFooterProps) {
  if (variant === 'marketing') {
    return (
      <div
        className={className}
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 10,
          maxWidth: 480,
          margin: '16px auto 0',
          padding: '12px 16px',
          borderRadius: 14,
          border: '2px solid color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
          background:
            'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 10%, var(--card-bg)), color-mix(in srgb, var(--accent-primary) 4%, var(--card-bg)))',
        }}
      >
        <ShieldCheck
          style={{
            width: 18,
            height: 18,
            marginTop: 1,
            flexShrink: 0,
            color: 'var(--accent-primary)',
          }}
          aria-hidden
        />
        <p style={{ margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--text-secondary)', textAlign: 'left' }}>
          {UPGRADE_PAGE_FOOTER}
        </p>
      </div>
    );
  }

  return (
    <div
      className={`mx-auto flex max-w-xl items-start gap-2.5 rounded-[14px] border-2 px-4 py-3 sm:px-5 ${className}`.trim()}
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
        background:
          'linear-gradient(135deg, color-mix(in srgb, var(--accent-primary) 11%, var(--card-bg)), color-mix(in srgb, var(--accent-primary) 4%, var(--card-bg)))',
      }}
      role="note"
    >
      <ShieldCheck
        className="mt-0.5 size-[18px] shrink-0 text-[var(--accent-primary)]"
        aria-hidden
      />
      <p className="text-left text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        <span style={{ color: 'var(--text-primary)' }}>Payments processed securely by Razorpay.</span>{' '}
        <span className="font-medium text-[var(--accent-primary)]">No auto-renewal.</span> Renew whenever you need.
      </p>
    </div>
  );
}
