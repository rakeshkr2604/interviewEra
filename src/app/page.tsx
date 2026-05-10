import MarketingLayout from '@/app/(marketing)/layout';
import LandingHero from '@/components/landing/LandingHero';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

function HeroBetaPill() {
  return (
    <>
      Now in private beta — join the waitlist · Built for Indian campus hiring
    </>
  );
}

export default function Page() {
  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero
          countPill={<HeroBetaPill />}
        />
        <LandingHomeClient />
      </main>
    </MarketingLayout>
  );
}
