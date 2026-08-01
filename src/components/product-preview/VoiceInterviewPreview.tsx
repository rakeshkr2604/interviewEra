import { CircleDot } from 'lucide-react';
import { LandingHeroSimulatorPoster } from '@/components/landing/LandingHeroSimulatorPoster';
import { ProductPreviewFrame } from '@/components/product-preview/ProductPreviewFrame';

const WAVEFORM_HEIGHTS = [5, 9, 6, 11, 4, 8, 5, 10, 7] as const;

/** Meera live voice session — static poster + session chrome (no video autoplay). */
export function VoiceInterviewPreview() {
  return (
    <ProductPreviewFrame label="Meera AI interviewer live voice session preview">
      <div className="ie-lh-demo-header flex items-center justify-between gap-2 px-3 py-2 sm:px-4">
        <span className="ie-lh-text-success inline-flex items-center gap-1.5 text-[11px] font-semibold">
          <CircleDot className="size-3.5" aria-hidden />
          LIVE
        </span>
        <span className="ie-lh-text-muted font-mono text-xs tabular-nums">02:34</span>
      </div>

      <div className="space-y-3 p-3 sm:p-4">
        <div
          className="ie-lh-border-card relative overflow-hidden rounded-xl border bg-[color-mix(in_srgb,var(--accent-primary)_6%,var(--card-bg))]"
        >
          <div className="mx-auto max-w-[200px] p-2">
            <LandingHeroSimulatorPoster />
          </div>
          <div
            className="ie-lh-text-primary px-3 py-2 text-center text-[11px] font-semibold sm:text-xs"
            style={{
              background: 'color-mix(in srgb, var(--bg-primary) 88%, transparent)',
            }}
          >
            Meera · AI Interviewer
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="ie-lh-text-success text-[10px] font-semibold">● Listening…</span>
          <div className="flex items-end gap-px" aria-hidden>
            {WAVEFORM_HEIGHTS.map((h, i) => (
              <div
                key={i}
                className="ie-lh-bg-success w-px rounded-full"
                style={{
                  height: h,
                  opacity: 0.35 + (i % 3) * 0.12,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </ProductPreviewFrame>
  );
}
