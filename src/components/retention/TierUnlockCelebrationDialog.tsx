'use client';

import Link from 'next/link';
import confetti from 'canvas-confetti';
import { motion } from 'motion/react';
import { Sparkles, Trophy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getTierPublicLabel } from '@/lib/retention/tier-copy';

export interface TierCelebrationPayload {
  newTier: number;
  /** Optional badges earned in same completion burst (keys match retention badges). */
  newBadges: string[];
  reportHref: string;
  /** Next-tier guidance from the server (same as API `progress`). */
  progressHint: string | null;
  nextTierNumber: number | null;
  /** 0–100 visual progress toward the next tier. */
  nextTierProgressPercent: number;
}

interface TierUnlockCelebrationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: TierCelebrationPayload | null;
}

const AUTO_DISMISS_MS = 5000;

function playUnlockChime(): void {
  if (typeof window === 'undefined') return;
  try {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = new AC();
    void ctx.resume().catch(() => {});
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.setValueAtTime(523.25, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(659.25, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.06, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.32);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    /* optional — ignore unsupported audio */
  }
}

export function TierUnlockCelebrationDialog({
  open,
  onOpenChange,
  data,
}: TierUnlockCelebrationDialogProps) {
  const [countdown, setCountdown] = useState(5);
  const onOpenChangeRef = useRef(onOpenChange);

  useEffect(() => {
    onOpenChangeRef.current = onOpenChange;
  }, [onOpenChange]);

  useEffect(() => {
    if (!open || !data) return;

    void confetti({
      particleCount: 120,
      spread: 68,
      origin: { y: 0.58 },
      ticks: 260,
      gravity: 1.02,
      scalar: 0.98,
      colors: ['#7c3aed', '#a855f7', '#c084fc', '#e9d5ff', '#fbbf24'],
    });

    const burstSides = window.setTimeout(() => {
      void confetti({
        particleCount: 48,
        angle: 60,
        spread: 50,
        origin: { x: 0, y: 0.68 },
        ticks: 200,
        colors: ['#a855f7', '#38bdf8'],
      });
      void confetti({
        particleCount: 48,
        angle: 120,
        spread: 50,
        origin: { x: 1, y: 0.68 },
        ticks: 200,
        colors: ['#a855f7', '#38bdf8'],
      });
    }, 180);

    playUnlockChime();

    const dismissTimer = window.setTimeout(() => {
      onOpenChangeRef.current(false);
    }, AUTO_DISMISS_MS);

    const interval = window.setInterval(() => {
      setCountdown((c) => Math.max(0, c - 1));
    }, 1000);

    return () => {
      window.clearTimeout(burstSides);
      window.clearTimeout(dismissTimer);
      window.clearInterval(interval);
    };
  }, [open, data]);

  if (!data) return null;

  const label = getTierPublicLabel(data.newTier);
  const progressPct = Math.min(100, Math.max(0, data.nextTierProgressPercent));
  const nextLabel =
    data.nextTierNumber !== null ? getTierPublicLabel(data.nextTierNumber) : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className="max-w-[min(100%-1.5rem,24rem)] overflow-hidden border-0 p-0 sm:max-w-md"
      >
        <motion.div
          key={data.newTier}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 380, damping: 28 }}
          className="flex w-full min-w-0 flex-col"
        >
              <div
                className="px-5 pt-6 pb-2 sm:px-7 sm:pt-7"
                style={{
                  background:
                    'linear-gradient(145deg, color-mix(in srgb, var(--accent-primary) 22%, transparent), color-mix(in srgb, var(--card-bg) 94%, transparent))',
                }}
              >
                <DialogHeader className="items-center text-center space-y-3">
                  <div className="relative flex h-20 items-center justify-center" aria-hidden>
                    <motion.div
                      className="absolute inset-0 flex items-center justify-center text-[var(--accent-primary)] opacity-[0.35]"
                      animate={{ rotate: [0, 8, -8, 0], scale: [1, 1.06, 1] }}
                      transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
                    >
                      <Sparkles className="h-16 w-16" strokeWidth={1.25} />
                    </motion.div>
                    <motion.div
                      initial={{ scale: 0.75, opacity: 0, rotate: -12 }}
                      animate={{ scale: 1, opacity: 1, rotate: 0 }}
                      transition={{ type: 'spring', stiffness: 440, damping: 20 }}
                      className="relative rounded-2xl bg-[color-mix(in_srgb,var(--card-bg)_88%,transparent)] p-3 shadow-[0_8px_40px_color-mix(in_srgb,var(--accent-primary)_22%,transparent)] ring-1 ring-[color-mix(in_srgb,var(--accent-primary)_35%,transparent)]"
                    >
                      <motion.div
                        animate={{ rotate: [0, -6, 6, -4, 0], y: [0, -2, 0] }}
                        transition={{ duration: 0.55, repeat: 2, ease: 'easeInOut' }}
                      >
                        <Trophy
                          className="h-11 w-11 text-[var(--accent-primary)]"
                          strokeWidth={1.75}
                          aria-hidden
                        />
                      </motion.div>
                    </motion.div>
                  </div>

                  <DialogTitle
                    className="text-lg sm:text-xl text-center font-semibold tracking-tight"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    Tier {data.newTier} unlocked
                  </DialogTitle>
                  <DialogDescription className="text-center px-1 space-y-2">
                    <span className="sr-only">
                      Congratulations, you unlocked a higher practice tier based on consistent
                      scores.
                    </span>
                    <span className="block text-base font-semibold" style={{ color: 'var(--accent-primary)' }}>
                      {label}
                    </span>
                    <span className="block text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      You're levelling up your prep — stronger questions and feedback are now
                      available.
                    </span>
                    {data.newBadges.length > 0 ? (
                      <span className="block text-xs pt-1" style={{ color: 'var(--text-muted)' }}>
                        New badge{data.newBadges.length > 1 ? 's' : ''}:{' '}
                        {data.newBadges.join(', ').replace(/_/g, ' ')}
                      </span>
                    ) : null}
                  </DialogDescription>

                  <div
                    className="mt-4 w-full rounded-xl px-3 py-3 text-left text-xs sm:text-sm ring-1 ring-[color-mix(in_srgb,var(--foreground)_8%,transparent)]"
                    style={{
                      background: 'color-mix(in srgb, var(--card-bg) 92%, transparent)',
                    }}
                  >
                    {data.nextTierNumber !== null && nextLabel ? (
                      <>
                        <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                          Next: Tier {data.nextTierNumber} · {nextLabel}
                        </p>
                        <div
                          className="mt-2 h-2 w-full overflow-hidden rounded-full"
                          style={{ background: 'color-mix(in srgb, var(--foreground) 12%, transparent)' }}
                          role="progressbar"
                          aria-valuenow={progressPct}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-label={`Progress toward tier ${data.nextTierNumber}`}
                        >
                          <motion.div
                            className="h-full rounded-full"
                            style={{
                              background:
                                'linear-gradient(90deg, var(--accent-primary), color-mix(in srgb, var(--accent-primary) 65%, white))',
                            }}
                            initial={{ width: 0 }}
                            animate={{ width: `${progressPct}%` }}
                            transition={{ duration: 0.85, ease: [0.22, 1, 0.36, 1] }}
                          />
                        </div>
                        {data.progressHint ? (
                          <p className="mt-2 leading-snug" style={{ color: 'var(--text-muted)' }}>
                            {data.progressHint}
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <p className="leading-snug font-medium" style={{ color: 'var(--text-secondary)' }}>
                        You've reached the highest practice tier. Keep sessions consistent to stay
                        sharp.
                      </p>
                    )}
                  </div>
                </DialogHeader>
              </div>

              <DialogFooter className="border-t-0 bg-transparent px-5 pb-5 pt-2 sm:px-7 sm:pb-6">
                <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-end">
                  <DialogClose
                    render={<Button variant="outline" className="w-full sm:w-auto text-xs sm:text-sm" />}
                  >
                    Close ({countdown}s)
                  </DialogClose>
                  <Button className="w-full sm:w-auto text-xs sm:text-sm" asChild type="button">
                    <Link href={data.reportHref}>View score report →</Link>
                  </Button>
                </div>
              </DialogFooter>
        </motion.div>
      </DialogContent>
    </Dialog>
  );
}
