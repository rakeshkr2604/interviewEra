'use client'

import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type DestructiveConfirmDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  phraseExact: string
  phraseLabel: string
  confirmLabel: string
  busyLabel: string
  inputValue: string
  onInputChange: (value: string) => void
  inputAriaLabel: string
  error: string | null
  busy: boolean
  onConfirm: () => void
}

export function DestructiveConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  phraseExact,
  phraseLabel,
  confirmLabel,
  busyLabel,
  inputValue,
  onInputChange,
  inputAriaLabel,
  error,
  busy,
  onConfirm,
}: DestructiveConfirmDialogProps) {
  const phraseOk = inputValue === phraseExact

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton
        className={cn(
          'max-w-[min(100%-1.5rem,28rem)] gap-0 overflow-hidden rounded-2xl p-0',
          'border-2 border-destructive/20 shadow-xl ring-1 ring-destructive/10 sm:max-w-lg',
        )}
      >
        <div
          className="border-b border-destructive/15 px-5 pt-5 pb-4 pr-14 sm:px-6 sm:pr-14"
          style={{
            background: 'color-mix(in srgb, var(--destructive) 7%, var(--popover))',
          }}
        >
          <div className="flex gap-3.5">
            <span
              className="mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl border border-destructive/25 bg-background/80 text-destructive shadow-sm"
              aria-hidden
            >
              <AlertTriangle className="size-5" strokeWidth={2} />
            </span>
            <div className="min-w-0 space-y-2">
              <DialogTitle className="font-heading text-lg font-semibold leading-snug tracking-tight text-balance text-foreground sm:text-xl">
                {title}
              </DialogTitle>
              <DialogDescription className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </DialogDescription>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div
            className="rounded-xl border-2 border-dashed px-4 py-3.5"
            style={{
              borderColor: 'color-mix(in srgb, var(--destructive) 28%, var(--border))',
              background: 'color-mix(in srgb, var(--destructive) 5%, var(--card))',
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {phraseLabel}
            </p>
            <p className="mt-2 font-mono text-sm font-semibold tracking-tight text-foreground break-all">
              {phraseExact}
            </p>
          </div>

          <div className="space-y-2">
            <label htmlFor={`destructive-confirm-${inputAriaLabel}`} className="text-sm font-medium text-foreground">
              Type the phrase exactly
            </label>
            <Input
              id={`destructive-confirm-${inputAriaLabel}`}
              value={inputValue}
              onChange={(e) => onInputChange(e.target.value)}
              autoComplete="off"
              spellCheck={false}
              aria-invalid={Boolean(error)}
              aria-label={inputAriaLabel}
              placeholder={phraseExact}
              className={cn(
                'h-10 font-mono text-sm',
                error && 'border-destructive/60 focus-visible:ring-destructive/30',
                phraseOk &&
                  !error &&
                  'border-emerald-500/40 focus-visible:border-emerald-500/50 focus-visible:ring-emerald-500/20',
              )}
            />
            {error ? (
              <p className="text-sm font-medium text-destructive" role="alert">
                {error}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground leading-relaxed">
                Copying and pasting is fine. The button stays disabled until it matches character for character.
              </p>
            )}
          </div>
        </div>

        <div
          className="flex flex-col-reverse gap-3 border-t border-border/60 px-5 py-4 sm:flex-row sm:items-center sm:justify-end sm:gap-4 sm:px-6"
          style={{ background: 'color-mix(in srgb, var(--muted) 45%, transparent)' }}
        >
          <Button
            type="button"
            variant="outline"
            size="default"
            className="w-full border-border/80 sm:w-auto"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="default"
            disabled={!phraseOk || busy}
            className={cn(
              'w-full font-semibold shadow-md transition-all sm:min-w-[11rem] sm:w-auto',
              'bg-destructive text-white hover:bg-destructive/90 hover:text-white',
              'focus-visible:ring-2 focus-visible:ring-destructive/45 focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:opacity-45 disabled:shadow-none disabled:grayscale-[0.15]',
            )}
            onClick={() => onConfirm()}
          >
            {busy ? busyLabel : confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
