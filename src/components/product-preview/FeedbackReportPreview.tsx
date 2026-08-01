import Link from 'next/link';
import { Lightbulb } from 'lucide-react';
import {
  FEEDBACK_PREVIEW_DIMENSIONS,
  FEEDBACK_PREVIEW_INSIGHT,
  FEEDBACK_PREVIEW_SCORE,
} from '@/components/product-preview/preview-data';
import { ProductPreviewFrame } from '@/components/product-preview/ProductPreviewFrame';
import { cn } from '@/lib/utils';

/** Report scores + one actionable insight — mirrors in-product answer feedback UI. */
export function FeedbackReportPreview() {
  const scoreColor =
    FEEDBACK_PREVIEW_SCORE.overall >= 7
      ? 'var(--accent-success)'
      : FEEDBACK_PREVIEW_SCORE.overall >= 5
        ? 'var(--accent-warning)'
        : 'var(--accent-danger)';

  return (
    <ProductPreviewFrame label="Interview report with answer feedback dimensions and coaching insight">
      <div className="p-3 sm:p-4">
        <div className="flex items-start justify-between gap-3 border-b pb-3" style={{ borderColor: 'var(--card-border)' }}>
          <div>
            <p className="ie-lh-text-muted text-[10px] font-bold uppercase tracking-[0.14em]">
              Interview Report
            </p>
            <p className="ie-lh-text-secondary mt-0.5 text-xs">Backend · Round 2</p>
          </div>
          <div className="text-right">
            <p
              className="font-[family-name:var(--font-jetbrains)] text-2xl font-bold tabular-nums leading-none"
              style={{ color: scoreColor }}
            >
              {FEEDBACK_PREVIEW_SCORE.overall.toFixed(1)}
            </p>
            <p className="ie-lh-text-muted text-[10px] font-medium">
              / 10 · {FEEDBACK_PREVIEW_SCORE.label}
            </p>
          </div>
        </div>

        <div className="mt-3 space-y-2.5">
          {FEEDBACK_PREVIEW_DIMENSIONS.map((bar) => {
            const isHigh = bar.val >= 7;
            const barColor = isHigh ? 'var(--accent-success)' : 'var(--accent-warning)';

            return (
              <div key={bar.name}>
                <div className="flex items-center justify-between gap-2 text-xs">
                  <span className="ie-lh-text-secondary">{bar.name}</span>
                  <span className="font-mono font-semibold tabular-nums" style={{ color: barColor }}>
                    {bar.val.toFixed(1)}
                  </span>
                </div>
                <div className="ie-lh-bg-tertiary mt-1 h-1.5 overflow-hidden rounded-full">
                  <div
                    className="v3-bar-fill-solid h-full rounded-full"
                    style={{ width: `${bar.pct}%`, background: barColor }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        <div
          className="mt-3 rounded-lg border px-3 py-2.5"
          style={{
            borderColor: 'color-mix(in srgb, var(--accent-warning) 28%, var(--card-border))',
            background: 'color-mix(in srgb, var(--accent-warning) 8%, transparent)',
          }}
        >
          <div className="flex items-start gap-2">
            <Lightbulb className="ie-lh-text-warning mt-0.5 size-4 shrink-0" aria-hidden />
            <div className="min-w-0 text-xs leading-relaxed">
              <p className="ie-lh-text-primary font-semibold">
                {FEEDBACK_PREVIEW_INSIGHT.dimension} · {FEEDBACK_PREVIEW_INSIGHT.score.toFixed(1)}
              </p>
              <p className="ie-lh-text-secondary mt-1">{FEEDBACK_PREVIEW_INSIGHT.tip}</p>
            </div>
          </div>
        </div>

        <div className="mt-3 text-center">
          <Link
            href="/#interview-report"
            className={cn(
              'ie-lh-text-accent inline-flex min-h-9 items-center justify-center rounded-lg border px-3 text-xs font-semibold',
              'transition-[border-color,background-color] duration-200',
              'hover:border-[color-mix(in_srgb,var(--accent-primary)_40%,var(--card-border))]',
            )}
            style={{
              borderColor: 'color-mix(in srgb, var(--accent-primary) 30%, var(--card-border))',
              background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
            }}
          >
            See Sample Interview Report
          </Link>
        </div>
      </div>
    </ProductPreviewFrame>
  );
}
