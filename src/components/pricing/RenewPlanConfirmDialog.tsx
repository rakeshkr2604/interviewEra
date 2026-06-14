'use client';

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatPlanExpiryEnIn } from '@/lib/pricing/copy';

interface RenewPlanConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  planExpiresAt: string;
  onConfirm: () => void;
  loading?: boolean;
}

export function RenewPlanConfirmDialog({
  open,
  onOpenChange,
  planExpiresAt,
  onConfirm,
  loading = false,
}: RenewPlanConfirmDialogProps) {
  const formatted = formatPlanExpiryEnIn(planExpiresAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Renew your plan?</DialogTitle>
          <DialogDescription className="sr-only">
            Confirm renewal before opening Razorpay checkout.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          <p>Your remaining days will NOT be lost.</p>
          <p>
            If your current plan expires on{' '}
            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
              {formatted}
            </span>
            , your renewal will extend from that date.
          </p>
        </div>
        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={loading}>
            {loading ? 'Opening checkout…' : 'Continue'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
