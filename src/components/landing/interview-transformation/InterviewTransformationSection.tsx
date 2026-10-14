import { ArrowRight, Check } from 'lucide-react';
import { StartFreeCtaLink } from '@/components/analytics/StartFreeCtaLink';
import {
  INTERVIEW_TRANSFORMATION_CAPABILITIES,
  INTERVIEW_TRANSFORMATION_CTA,
  INTERVIEW_TRANSFORMATION_INTRO,
} from '@/lib/landing/interview-transformation-content';
import { CapabilityCard } from '@/components/landing/interview-transformation/CapabilityCard';
import { JourneyVisualization } from '@/components/landing/interview-transformation/JourneyVisualization';
import { TransformationFootnotes } from '@/components/landing/interview-transformation/TransformationFootnotes';
import { TransformationRibbon } from '@/components/landing/interview-transformation/TransformationRibbon';
import { TrustStatement } from '@/components/landing/interview-transformation/TrustStatement';
import './InterviewTransformation.css';

export default function InterviewTransformationSection() {
  return (
    <section
      id="practice-transformation"
      className="ie-interview-transformation"
      aria-labelledby="interview-transformation-heading"
    >
      <div className="ie-interview-transformation__inner">
        <div className="ie-it-hero">
          <header className="ie-it-header">
            <p className="ie-it-eyebrow">{INTERVIEW_TRANSFORMATION_INTRO.eyebrow}</p>
            <h2 id="interview-transformation-heading" className="ie-it-headline">
              <span className="ie-it-headline__line">{INTERVIEW_TRANSFORMATION_INTRO.headlineLead}</span>
              <span className="ie-it-headline__line">
                <span className="ie-it-headline__accent">{INTERVIEW_TRANSFORMATION_INTRO.headlineAccent}</span>{' '}
                {INTERVIEW_TRANSFORMATION_INTRO.headlineTail}
              </span>
            </h2>
            <p className="ie-it-supporting">{INTERVIEW_TRANSFORMATION_INTRO.supportingCopy}</p>
          </header>

          <JourneyVisualization />
        </div>

        <div className="ie-it-capabilities" role="list">
          {INTERVIEW_TRANSFORMATION_CAPABILITIES.map((capability) => (
            <div key={capability.id} role="listitem">
              <CapabilityCard capability={capability} />
            </div>
          ))}
        </div>

        <TransformationRibbon />

        <div className="ie-it-closing">
          <TrustStatement />
          <div className="ie-it-cta">
            <StartFreeCtaLink
              href="/signup"
              section={INTERVIEW_TRANSFORMATION_CTA.section}
              ctaText={INTERVIEW_TRANSFORMATION_CTA.label}
              className="v3-btn-primary ie-it-cta__button"
            >
              {INTERVIEW_TRANSFORMATION_CTA.label}
              <ArrowRight className="size-4" aria-hidden />
            </StartFreeCtaLink>
            <p className="ie-it-cta__footnote">
              <Check className="ie-it-cta__footnote-icon size-3" aria-hidden />
              {INTERVIEW_TRANSFORMATION_CTA.footnote}
            </p>
          </div>
        </div>

        <TransformationFootnotes />
      </div>
    </section>
  );
}
