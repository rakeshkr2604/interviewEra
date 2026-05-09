import MarketingLayout from '@/app/(marketing)/layout';
import LandingHero from '@/components/landing/LandingHero';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { resolveInternalSiteOrigin } from '@/lib/server/internal-origin';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

async function getDisplayCount(): Promise<string> {
  const origin = resolveInternalSiteOrigin();
  try {
    const res = await fetch(`${origin}/api/stats/student-count`, {
      next: { revalidate: 3600 },
    });
    if (!res.ok) return '1,000+';
    const body = (await res.json()) as { displayCount?: string };
    return typeof body.displayCount === 'string' ? body.displayCount : '1,000+';
  } catch {
    return '1,000+';
  }
}

export default async function Page() {
  const displayCount = await getDisplayCount();

  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero displayCount={displayCount} />
        <LandingHomeClient />
      </main>
    </MarketingLayout>
  );
}
