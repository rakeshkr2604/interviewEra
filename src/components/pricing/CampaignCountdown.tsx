'use client';

import { useEffect, useState } from 'react';
import { formatCountdownClock, remainingMsFromServerClock } from '@/lib/pricing/countdown';

export function CampaignCountdown({
  expiresAt,
  serverNow,
  onExpired,
  size = 'compact',
}: {
  expiresAt: string;
  serverNow: string;
  onExpired?: () => void;
  size?: 'compact' | 'hero';
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const offsetCapturedAtMs = Date.now();
    let expiredCalled = false;
    const update = () => {
      const next = remainingMsFromServerClock({
        expiresAt,
        serverNow,
        clientNowMs: Date.now(),
        offsetCapturedAtMs,
      });
      setRemaining(next);
      if (next <= 0 && !expiredCalled) {
        expiredCalled = true;
        onExpired?.();
      }
    };
    update();
    const timer = window.setInterval(update, 1_000);
    return () => window.clearInterval(timer);
  }, [expiresAt, onExpired, serverNow]);

  if (remaining === null || remaining <= 0) return null;

  const clock = formatCountdownClock(remaining);
  const units = clock.split(' : ');
  const labels =
    units.length === 4 ? (['DD', 'HH', 'MM', 'SS'] as const) : (['HH', 'MM', 'SS'] as const);

  if (size === 'hero') {
    return (
      <div className="flex flex-col items-center gap-2 sm:items-end">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: 'var(--text-muted)' }}>
          Offer ends in
        </p>
        <div className="flex items-center gap-1.5" aria-live="polite">
          {units.map((unit, index) => (
            <div key={`${labels[index]}-${unit}`} className="flex items-center gap-1.5">
              {index > 0 ? (
                <span className="text-sm font-bold" style={{ color: 'var(--text-muted)' }}>
                  :
                </span>
              ) : null}
              <div className="min-w-[2.75rem] rounded-lg px-2 py-1.5 text-center" style={{ background: 'var(--card-bg)' }}>
                <p className="text-lg font-bold tabular-nums leading-none" style={{ color: 'var(--text-primary)' }}>
                  {unit}
                </p>
                <p className="mt-1 text-[9px] font-bold tracking-widest" style={{ color: 'var(--text-muted)' }}>
                  {labels[index]}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <p className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
      Offer ends in{' '}
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {clock}
      </span>
    </p>
  );
}
