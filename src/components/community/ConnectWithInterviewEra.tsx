import { COMMUNITY_COPY } from '@/lib/community/community';
import { defaultCtaLabel } from '@/lib/community/community';
import {
  getConnectSectionPlatforms,
  isConnectRowClickable,
} from '@/lib/community/selectors';
import { ConnectWithInterviewEraRow } from '@/components/community/ConnectWithInterviewEraRow';
import { cn } from '@/lib/utils';

interface ConnectWithInterviewEraProps {
  className?: string;
  placement?: 'connect_section' | 'community_hub';
}

export function ConnectWithInterviewEra({
  className,
  placement = 'connect_section',
}: ConnectWithInterviewEraProps) {
  const platforms = getConnectSectionPlatforms();
  if (platforms.length === 0) return null;

  return (
    <section
      className={cn(className)}
      aria-labelledby="connect-with-interviewera-heading"
    >
      <div className="mb-6 text-center sm:text-left">
        <h2
          id="connect-with-interviewera-heading"
          className="text-xl font-bold sm:text-2xl"
          style={{ color: 'var(--text-primary)' }}
        >
          {COMMUNITY_COPY.connectTitle}
        </h2>
        <p className="mt-2 text-sm sm:text-base" style={{ color: 'var(--text-secondary)' }}>
          {COMMUNITY_COPY.connectSubtitle}
        </p>
      </div>

      <ul
        className="divide-y overflow-hidden rounded-2xl border"
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
        }}
        role="list"
      >
        {platforms.map((platform) => {
          const clickable = isConnectRowClickable(platform);
          const cta = platform.ctaLabel ?? defaultCtaLabel(platform.category);

          return (
            <li key={platform.id}>
              <ConnectWithInterviewEraRow
                platform={platform}
                placement={placement}
                clickable={clickable}
                ctaLabel={clickable ? cta : (platform.connectNote ?? 'Coming soon')}
              />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
