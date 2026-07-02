'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Copy, Gift, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { trackProductEventClient } from '@/lib/analytics/product-events';

export function ReferralShareCard({ referralCode }: { referralCode: string }) {
  const [copied, setCopied] = useState(false);
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://interviewera.com';
  const shareUrl = `${appUrl.replace(/\/$/, '')}/join?ref=${encodeURIComponent(referralCode)}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      trackProductEventClient('referral_link_shared', { referral_code: referralCode });
      toast.success('Referral link copied!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Could not copy — select the link manually.');
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Gift className="size-5" style={{ color: 'var(--accent-primary)' }} />
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Invite friends, earn credits
        </p>
      </div>
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Share your link. When a friend completes their first mock interview, you both get +1 credit.
      </p>
      <div
        className="flex flex-col gap-2 rounded-xl border px-3 py-2 sm:flex-row sm:items-center"
        style={{ borderColor: 'var(--card-border)', background: 'var(--bg-secondary)' }}
      >
        <code className="min-w-0 flex-1 truncate text-xs sm:text-sm" style={{ color: 'var(--text-secondary)' }}>
          {shareUrl}
        </code>
        <Button type="button" size="sm" variant="outline" onClick={() => void copyLink()} className="shrink-0 gap-1.5">
          {copied ? <Share2 className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? 'Copied' : 'Copy link'}
        </Button>
      </div>
    </div>
  );
}
