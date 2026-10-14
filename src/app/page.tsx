import MarketingLayout from '@/app/(marketing)/layout';
import { HomeMoneyPageLinks } from '@/components/seo/HomeMoneyPageLinks';
import LandingHero from '@/components/landing/LandingHero';
import {
  AudiencePathSectionLazy,
  InterviewTransformationSectionLazy,
  LandingFaqLazy,
  LandingFinalCtaLazy,
  LandingMeetInterviewersLazy,
  LandingScoringEngineLazy,
  LandingTimelineSectionLazy,
  LandingTrustMetricsLazy,
} from '@/components/landing/LandingHomeClient';
import { LandingFaqJsonLd } from '@/components/landing/LandingFaqJsonLd';
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
 * Section order: Hero → AudiencePath → TrustMetrics → Timeline → ScoringEngine → Founder →
 * MeetInterviewers → InterviewTransformation → FAQ → FinalCta → MoneyPageLinks.
 *
 * LCP: hero simulator poster (`female-avatar-*.avif`) — single high-priority preload only.
 */
export default function Page() {
  return (
    <MarketingLayout>
      {/* Hoisted to <head> — matches LandingHeroSimulatorPoster srcSet/sizes. */}
      <link
        rel="preload"
        as="image"
        type="image/avif"
        href="/assets/female-avatar-600.avif"
        imageSrcSet="/assets/female-avatar-300.avif 300w, /assets/female-avatar-600.avif 600w"
        imageSizes="(max-width: 560px) 280px, 150px"
        fetchPriority="high"
      />
      <main id="main-content">
        <LandingHero countPill={<HeroBetaPill />} />
        <AudiencePathSectionLazy />
        <LandingTrustMetricsLazy />
        <LandingTimelineSectionLazy />
        <LandingScoringEngineLazy />
        <LandingFounderSection />
        <LandingMeetInterviewersLazy />
        <InterviewTransformationSectionLazy />
        <LandingFaqJsonLd />
        <LandingFaqLazy />
        <LandingFinalCtaLazy />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
