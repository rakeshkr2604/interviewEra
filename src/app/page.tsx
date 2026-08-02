import MarketingLayout from '@/app/(marketing)/layout';
import { HomeMoneyPageLinks } from '@/components/seo/HomeMoneyPageLinks';
import { AudiencePathSection } from '@/components/landing/AudiencePathSection';
import LandingHero from '@/components/landing/LandingHero';
import {
  LandingFinalCtaLazy,
  LandingMeetInterviewersLazy,
  LandingScoringEngineLazy,
  LandingTimelineSectionLazy,
} from '@/components/landing/LandingHomeClient';
import { InterviewTransformationSection } from '@/components/landing/interview-transformation/InterviewTransformationSection';
import { LandingFaq } from '@/components/landing/LandingFaq';
import { LandingFounderSection } from '@/components/landing/LandingFounderSection';
import { LandingTrustMetrics } from '@/components/landing/LandingTrustMetrics';
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
 * Section order: Hero → AudiencePath → TrustMetrics → Timeline → ScoringEngine → Founder →
 * MeetInterviewers → InterviewTransformation → FAQ → FinalCta → MoneyPageLinks.
 */
export default function Page() {
  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero countPill={<HeroBetaPill />} />
        <AudiencePathSection />
        <LandingTrustMetrics />
        <LandingTimelineSectionLazy />
        <LandingScoringEngineLazy />
        <LandingFounderSection />
        <LandingMeetInterviewersLazy />
        <InterviewTransformationSection />
        <LandingFaq />
        <LandingFinalCtaLazy />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
