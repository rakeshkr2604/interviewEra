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
import { LandingProblemSection } from '@/components/landing/LandingProblemSection';
import { FreePreparationToolkit } from '@/components/landing/FreePreparationToolkit';
import { LandingPrepComparison } from '@/components/landing/LandingPrepComparison';
import { LandingPricingPreview } from '@/components/landing/LandingPricingPreview';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

function HeroBetaPill() {
  return <>Your complete interview preparation starts here.</>;
}

/**
 * Homepage narrative: who it is for → trust → problem → product + free toolkit → benefits →
 * how it works → product evidence → pricing → FAQ → conversion.
 * Campus/T&P content lives on /campus; deep FAQ/support lives in the Help Center.
 *
 * Section order: Hero → AudiencePath → TrustMetrics (position and content intentionally fixed) →
 * Problem → FreePreparationToolkit (#free-tools) → InterviewTransformation (benefits + before/after) →
 * PrepComparison → Timeline (#how) → ScoringEngine (#interview-report) → MeetInterviewers →
 * PricingPreview (+ DSA roadmap) → FAQ → FinalCta → MoneyPageLinks.
 * The founder story lives on /about.
 *
 * New sections are Server Components (static HTML, crawlable tool links); interactive
 * islands stay viewport-deferred.
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
      <main id="main-content" className="ie-home-compact">
        <LandingHero countPill={<HeroBetaPill />} />
        <AudiencePathSectionLazy />
        <LandingTrustMetricsLazy />
        <LandingProblemSection />
        <FreePreparationToolkit />
        <InterviewTransformationSectionLazy />
        <LandingPrepComparison />
        <LandingTimelineSectionLazy />
        <LandingScoringEngineLazy />
        <LandingMeetInterviewersLazy />
        <LandingPricingPreview />
        <LandingFaqJsonLd />
        <LandingFaqLazy />
        <LandingFinalCtaLazy />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
