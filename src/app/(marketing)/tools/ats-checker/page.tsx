import type { Metadata } from 'next';
import { FileSearch, Shield, Sparkles, Zap } from 'lucide-react';
import { generateMetadata, brandPageTitle, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { webApplicationJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { AtsCheckerForm } from './AtsCheckerForm';
import { AtsHeroExplainVisual } from './AtsHeroExplainVisual';
import { AtsTrustRow } from './AtsTrustRow';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';

const ATS_OG_TITLE = 'Free Resume Parser Check';

export const metadata: Metadata = generateMetadata({
  title: ATS_OG_TITLE,
  description:
    'See exactly how a typical parser reads your resume — Parseability, Field Extraction, Structure Quality, and optional JD Match, with explainable fixes. Free, no sign-up.',
  path: '/tools/ats-checker',
  socialTitle: brandPageTitle(ATS_OG_TITLE),
  keywords:
    'resume parser check, ATS resume checker, parseability, resume field extraction, resume structure check',
});

export const runtime = 'nodejs';
export const maxDuration = 30;

const ORIGIN = getCanonicalSiteOrigin();

const ATS_WEBAPP_LD = webApplicationJsonLd({
  name: 'Free Resume Parser Check',
  description:
    'See exactly how a typical parser reads your resume. InterviewEra reports Parseability, Field Extraction, Structure Quality, and optional JD Match with explainable fixes — free, no sign-up. Not a single universal ATS score.',
  url: canonicalUrl('/tools/ats-checker'),
  providerId: schemaIds.organization,
});

const ATS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools/ats-checker' },
    { name: 'Resume Parser Check', path: '/tools/ats-checker' },
  ],
  ORIGIN,
);

const BULLETS = [
  {
    icon: Sparkles,
    text: 'Four explainable scores — never one blended “ATS %”',
  },
  { icon: Zap, text: 'See the exact fields a parser pulls from your file' },
  { icon: Shield, text: 'Free · no account · file analyzed then discarded' },
] as const;

export default function AtsCheckerPage() {
  return (
    <>
      <JsonLdScript id="ats-webapp-ld" data={ATS_WEBAPP_LD} />
      <JsonLdScript id="ats-breadcrumb-ld" data={ATS_BREADCRUMB_LD} />
      <FreeToolPageLayout
        eyebrow="Free tool · no sign-up"
        eyebrowIcon={FileSearch}
        title="See how a parser reads your resume"
        description="Upload a PDF, Word, or TXT. We show what a typical ATS recovers — and which layout risks bury your details."
        leftSlot={<AtsHeroExplainVisual />}
        bullets={BULLETS}
        bulletsLayout="row"
        bottomSlot={<AtsTrustRow />}
      >
        <AtsCheckerForm />
      </FreeToolPageLayout>
    </>
  );
}
