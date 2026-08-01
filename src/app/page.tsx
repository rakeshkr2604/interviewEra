import MarketingLayout from '@/app/(marketing)/layout';
import { HomeMoneyPageLinks } from '@/components/seo/HomeMoneyPageLinks';
import { AudiencePathSection } from '@/components/landing/AudiencePathSection';
import LandingHero from '@/components/landing/LandingHero';
import {
  LandingFinalCtaLazy,
  LandingMeetInterviewersLazy,
  LandingScoringEngineLazy,
  LandingScrollShowcaseLazy,
} from '@/components/landing/LandingHomeClient';
import { LandingWhyFail } from '@/components/landing/LandingWhyFail';
import { LandingPositioningSection } from '@/components/landing/LandingPositioningSection';
import { LandingInterviewDemo } from '@/components/landing/LandingInterviewDemo';
import { LandingBeforeAfter } from '@/components/landing/LandingBeforeAfter';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFounderSection } from '@/components/landing/LandingFounderSection';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

function HeroBetaPill() {
  return <>Resume-aware · Mock Interview practice</>;
}

/**
 * Homepage narrative: problem → trust → product proof → conversion.
 * Campus/T&P content lives on /campus; deep FAQ/support lives in the Help Center.
 *
 * Section order: Hero → WhyFail → Founder → MeetInterviewers → ScrollShowcase → InterviewDemo →
 * ScoringEngine → BeforeAfter → Positioning → AudiencePath → FAQ → FinalCta → MoneyPageLinks.
 */
export default function Page() {
  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero countPill={<HeroBetaPill />} />
        <LandingWhyFail />
        <LandingFounderSection />
        <LandingMeetInterviewersLazy />
        <LandingScrollShowcaseLazy />
        <LandingInterviewDemo />
        <LandingScoringEngineLazy />
        <LandingBeforeAfter />
        <LandingPositioningSection />
        <AudiencePathSection />
        <LandingFaq />
        <LandingFinalCtaLazy />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
