'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { posthog } from '@/lib/analytics/posthog';

interface ShareCardProps {
  overallScore: number;
  role: string;
}

export function ShareCard({ overallScore, role }: ShareCardProps) {
  const [copied, setCopied] = useState(false);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const cardUrl = `${appUrl}/api/share/card?score=${overallScore.toFixed(1)}&role=${encodeURIComponent(role)}`;
  const shareText = `I scored ${overallScore.toFixed(1)}/10 in my ${role} mock interview on InterviewEra! Can you beat it? ${appUrl}`;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard not available
    }
  }

  async function shareNative() {
    if (!navigator.share) return;
    try {
      await navigator.share({ text: shareText, url: appUrl });
    } catch {
      // User cancelled
    }
  }

  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;

  return (
    <div
      className="dashboard-premium-card--overflow-visible overflow-hidden rounded-[22px] border-2 lg:rounded-3xl"
      style={{
        borderColor: 'color-mix(in srgb, var(--accent-primary) 35%, var(--card-border))',
        boxShadow:
          'var(--card-shadow), 0 0 64px color-mix(in srgb, var(--accent-primary) 20%, transparent)',
        background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
        color: '#fff',
      }}
    >
      <div className="relative px-6 pb-6 pt-8 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_-20%,rgba(255,255,255,0.12),transparent)]"
          aria-hidden
        />
        <div className="relative text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80 sm:text-[11px]">
            Share
          </p>
          <p className="mt-2 text-4xl font-bold tabular-nums text-white">{overallScore.toFixed(1)}/10</p>
          <p className="mt-1 text-sm text-white/85">{role} interview</p>
        </div>

        <Dialog>
          <DialogTrigger
            render={
              <Button
                variant="secondary"
                className="relative mt-6 w-full border border-white/25 bg-white/15 font-semibold text-white shadow-sm backdrop-blur-sm hover:bg-white/25"
                onClick={() => posthog.capture('share_card_generated', { score: overallScore, role })}
              >
                Share your result
              </Button>
            }
          />
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Share your score</DialogTitle>
            </DialogHeader>

            {/* Card preview */}
            <div className="overflow-hidden rounded-lg border">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={cardUrl}
                alt="Score share card"
                className="w-full"
                loading="lazy"
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              {/* Copy link */}
              <Button variant="outline" onClick={copyLink} className="w-full">
                {copied ? 'Copied!' : 'Copy share text'}
              </Button>

              {/* Download */}
              <a href={cardUrl} download="interviewera-score.png" className="w-full">
                <Button variant="outline" className="w-full">
                  Download image
                </Button>
              </a>

              {/* WhatsApp */}
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
                  Share on WhatsApp
                </Button>
              </a>

              {/* Native share (mobile) */}
              {typeof navigator !== 'undefined' && 'share' in navigator && (
                <Button variant="ghost" onClick={shareNative} className="w-full">
                  More sharing options
                </Button>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
