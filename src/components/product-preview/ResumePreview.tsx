import { Check, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  RESUME_PREVIEW_FILE,
  RESUME_PREVIEW_PIPELINE,
} from '@/components/product-preview/preview-data';

/** Static resume upload outcome — uses dashboard upload design language. */
export function ResumePreview() {
  return (
    <div
      className="space-y-3 p-3 sm:p-4"
      role="img"
      aria-label="Resume uploaded, analyzed, and personalized for interview questions"
    >
      <div className="ie-lh-surface-94 flex items-center gap-3 rounded-xl border p-3">
        <span className="ie-lh-icon-tile-primary flex size-10 shrink-0 items-center justify-center rounded-xl">
          <FileText className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="ie-lh-text-primary truncate text-sm font-semibold">{RESUME_PREVIEW_FILE.name}</p>
          <p className="ie-lh-text-muted text-xs">{RESUME_PREVIEW_FILE.meta}</p>
        </div>
        <Check className="ie-lh-text-success size-5 shrink-0" aria-hidden />
      </div>

      <p className="ie-lh-surface-accent-soft ie-lh-text-secondary rounded-lg border px-3 py-2 text-xs leading-relaxed">
        {RESUME_PREVIEW_FILE.message}
      </p>

      <ol className="grid list-none grid-cols-3 gap-1.5 p-0" aria-label="Resume processing pipeline">
        {RESUME_PREVIEW_PIPELINE.map((label, index) => (
          <li key={label}>
            <div
              className={cn(
                'rounded-lg border px-2 py-1.5 text-center text-[10px] font-bold uppercase tracking-wide',
                index === RESUME_PREVIEW_PIPELINE.length - 1
                  ? 'ie-lh-surface-accent ie-lh-text-accent'
                  : 'ie-lh-text-secondary',
              )}
            >
              {label}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
