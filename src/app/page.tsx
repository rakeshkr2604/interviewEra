import MarketingLayout from '@/app/(marketing)/layout';
import LandingHero from '@/components/landing/LandingHero';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { resolveInternalSiteOrigin } from '@/lib/server/internal-origin';
import { PAGE_SEO } from '@/lib/seo/metadata';
import { createClient } from '@/lib/supabase/server';

export const metadata = PAGE_SEO.home;
/** ISR for cached student-count fetch; hero copy is server-rendered for LCP. */
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
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const isLoggedIn = Boolean(user);
  const displayCount = await getDisplayCount();

  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero isLoggedIn={isLoggedIn} displayCount={displayCount} />
        <LandingHomeClient initialLoggedIn={isLoggedIn} />
      </main>
    </MarketingLayout>
  );
}
