'use client';

import { useEffect, useState } from 'react';

function remainingParts(milliseconds: number) {
  const totalMinutes = Math.max(0, Math.floor(milliseconds / 60_000));
  return {
    days: Math.floor(totalMinutes / 1_440),
    hours: Math.floor((totalMinutes % 1_440) / 60),
    minutes: totalMinutes % 60,
  };
}

export function CampaignCountdown({
  expiresAt,
  serverNow,
  onExpired,
}: {
  expiresAt: string;
  serverNow: string;
  onExpired?: () => void;
}) {
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    const serverOffset = Date.parse(serverNow) - Date.now();
    const expiry = Date.parse(expiresAt);
    let expiredCalled = false;
    const update = () => {
      const next = expiry - (Date.now() + serverOffset);
      setRemaining(next);
      if (next <= 0 && !expiredCalled) {
        expiredCalled = true;
        onExpired?.();
      }
    };
    update();
    const timer = window.setInterval(update, 30_000);
    return () => window.clearInterval(timer);
  }, [expiresAt, onExpired, serverNow]);

  if (remaining === null || remaining <= 0) return null;
  const parts = remainingParts(remaining);

  return (
    <p className="text-xs font-medium tabular-nums" style={{ color: 'var(--text-secondary)' }}>
      Offer ends in{' '}
      <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
        {parts.days > 0 ? `${String(parts.days).padStart(2, '0')}d ` : ''}
        {String(parts.hours).padStart(2, '0')}h {String(parts.minutes).padStart(2, '0')}m
      </span>
    </p>
  );
}
