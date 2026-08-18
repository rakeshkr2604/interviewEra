import Link from 'next/link';
import { CheckCircle2, UserRound } from 'lucide-react';
import {
  profileFieldLabel,
  type ProfileOnboardingResolution,
} from '@/lib/profile/onboarding-state';

export function ProfileCompletionCard({
  resolution,
}: {
  resolution: ProfileOnboardingResolution;
}) {
  if (resolution.completionPercentage === 100) return null;

  return (
    <section className="dashboard-section" aria-labelledby="profile-completion-heading">
      <div className="dashboard-premium-card px-4 py-4 sm:px-6 sm:py-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <div
                className="flex size-8 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
                  color: 'var(--accent-primary)',
                }}
              >
                <UserRound className="size-4" aria-hidden />
              </div>
              <div>
                <h2 id="profile-completion-heading" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Profile completion: {resolution.completionPercentage}%
                </h2>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Complete details improve question and preparation relevance.
                </p>
              </div>
            </div>
            <div
              className="mt-3 h-2 overflow-hidden rounded-full"
              style={{ background: 'var(--bg-tertiary)' }}
              role="progressbar"
              aria-label="Profile completion"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={resolution.completionPercentage}
            >
              <div
                className="h-full rounded-full transition-[width]"
                style={{
                  width: `${resolution.completionPercentage}%`,
                  background: 'var(--accent-primary)',
                }}
              />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {resolution.missingFields.map((field) => (
                <span
                  key={field}
                  className="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <CheckCircle2 className="size-3 opacity-35" aria-hidden />
                  Missing: {profileFieldLabel(field)}
                </span>
              ))}
            </div>
          </div>
          <Link
            href="/welcome?edit=1"
            className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'var(--accent-primary)' }}
          >
            Complete profile
          </Link>
        </div>
      </div>
    </section>
  );
}
