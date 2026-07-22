import MarketingLayout from '@/app/(marketing)/layout';
import { HomeMoneyPageLinks } from '@/components/seo/HomeMoneyPageLinks';
import { AudiencePathSection } from '@/components/landing/AudiencePathSection';
import LandingHero from '@/components/landing/LandingHero';
import {
  LandingFinalCtaLazy,
  LandingHomeMidFoldLazy,
  LandingScoringEngineLazy,
  LandingScrollShowcaseLazy,
} from '@/components/landing/LandingHomeClient';
import { LandingWhyFail } from '@/components/landing/LandingWhyFail';
import { LandingPositioningSection } from '@/components/landing/LandingPositioningSection';
import { LandingInterviewDemo } from '@/components/landing/LandingInterviewDemo';
import { LandingBeforeAfter } from '@/components/landing/LandingBeforeAfter';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFounderSection } from '@/components/landing/LandingFounderSection';
import { CommunitySection } from '@/components/community/CommunitySection';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

function HeroBetaPill() {
  return <>Resume-aware adaptive interview simulation</>;
}

/**
 * Homepage narrative: positioning → trust → conversion (not documentation).
 * Campus/T&P content lives on /campus; deep FAQ/support lives in the Help Center.
 *
 * Section order (Phase 3d): Hero → problem → how-it-works → demo → scoring →
 * before/after → positioning → founder → audience → community → FAQ → final CTA → SEO links.
 * MarketingFooter stays in MarketingLayout.
 */
export default function Page() {
  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero countPill={<HeroBetaPill />} />
        <LandingWhyFail />
        <LandingScrollShowcaseLazy />
        {/* PENDING DECISION (Phase 3d): LandingHomeMidFold — kept after ScrollShowcase
            (former relative position). Not in the approved hierarchy; decide keep/move/remove. */}
        <LandingHomeMidFoldLazy />
        <LandingInterviewDemo />
        <LandingScoringEngineLazy />
        <LandingBeforeAfter />
        <LandingPositioningSection />
        <LandingFounderSection />
        <AudiencePathSection />
        <CommunitySection />
        <LandingFaq />
        <LandingFinalCtaLazy />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
