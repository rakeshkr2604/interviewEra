'use client';

import { useEffect, useState, useActionState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { savePlacementDate, type PlacementDateState } from '@/app/actions/placement-date';

const SKIP_KEY = 'interviewera_placement_skip_ts';
const SKIP_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days

const MONTHS = [
  { value: '01', label: 'January' },
  { value: '02', label: 'February' },
  { value: '03', label: 'March' },
  { value: '04', label: 'April' },
  { value: '05', label: 'May' },
  { value: '06', label: 'June' },
  { value: '07', label: 'July' },
  { value: '08', label: 'August' },
  { value: '09', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
] as const;

interface PlacementDateModalProps {
  hasPlacementDate: boolean;
}

const initialState: PlacementDateState = { success: false, error: null };

const SELECT_CLASS =
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring';

export function PlacementDateModal({ hasPlacementDate }: PlacementDateModalProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [state, formAction, isPending] = useActionState(savePlacementDate, initialState);

  // On mount: open if no placement date and skip timer has expired.
  // setState on mount is intentional modal-open behavior, not cascading.
  useEffect(() => {
    if (hasPlacementDate) return;
    try {
      const skipTs = localStorage.getItem(SKIP_KEY);
      if (skipTs) {
        const elapsed = Date.now() - parseInt(skipTs, 10);
        if (elapsed < SKIP_DURATION_MS) return;
      }
    } catch {
      // localStorage may be unavailable (SSR guards, private mode)
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(true);
  }, [hasPlacementDate]);

  // On successful save: close modal and refresh server data.
  // Conditional setState on state.success is intentional — runs exactly once.
  useEffect(() => {
    if (state.success) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.refresh();
    }
  }, [state.success, router]);

  function handleSkip() {
    try {
      localStorage.setItem(SKIP_KEY, String(Date.now()));
    } catch {
      // ignore
    }
    setOpen(false);
  }

  function handleOpenChange(newOpen: boolean) {
    // Treat dialog dismiss (Escape / backdrop click) the same as "Skip for now"
    if (!newOpen && !state.success) {
      handleSkip();
      return;
    }
    setOpen(newOpen);
  }

  if (hasPlacementDate) return null;

  const currentYear = new Date().getFullYear();
  const years = [currentYear, currentYear + 1, currentYear + 2];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent showCloseButton={false} className="max-w-sm">
        <DialogHeader>
          <DialogTitle>When is your placement season?</DialogTitle>
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          <p className="text-sm text-muted-foreground">
            We&apos;ll show a countdown on your dashboard so you stay on track.
          </p>

          <div className="flex gap-3">
            <select name="month" defaultValue="08" className={SELECT_CLASS}>
              {MONTHS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>

            <select name="year" defaultValue={String(currentYear)} className={SELECT_CLASS}>
              {years.map((y) => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {state.error && <p className="text-sm text-destructive">{state.error}</p>}

          <DialogFooter>
            <Button type="button" variant="ghost" size="sm" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? 'Saving…' : 'Set my date'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
