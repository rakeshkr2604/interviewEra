import type { Metadata } from 'next';
import { FileSearch, Shield, Sparkles, Zap } from 'lucide-react';
import { generateMetadata, brandPageTitle, schemaIds } from '@/lib/seo/metadata';
import { JsonLdScript } from '@/components/seo/JsonLdScript';
import { webApplicationJsonLd, breadcrumbListJsonLd } from '@/lib/seo/schema/jsonld';
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url';
import { AtsCheckerForm } from './AtsCheckerForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';

const ATS_OG_TITLE = 'Free ATS Resume Checker';

export const metadata: Metadata = generateMetadata({
  title: ATS_OG_TITLE,
  description:
    'Find out if your resume passes Applicant Tracking Systems. Instant ATS compatibility score with actionable fixes — no sign-up required.',
  path: '/tools/ats-checker',
  socialTitle: brandPageTitle(ATS_OG_TITLE),
  keywords: 'ATS resume checker, applicant tracking system, resume scanner, ATS score, resume check',
});

export const runtime = 'nodejs';
export const maxDuration = 30;

const ORIGIN = getCanonicalSiteOrigin();

const ATS_WEBAPP_LD = webApplicationJsonLd({
  name: 'Free ATS Resume Checker',
  description:
    'Check if your resume passes Applicant Tracking Systems. Get an instant ATS compatibility score with actionable keyword and structure fixes — free, no sign-up.',
  url: canonicalUrl('/tools/ats-checker'),
  providerId: schemaIds.organization,
});

const ATS_BREADCRUMB_LD = breadcrumbListJsonLd(
  [
    { name: 'Home', path: '/' },
    { name: 'Free Tools', path: '/tools/ats-checker' },
    { name: 'ATS Resume Checker', path: '/tools/ats-checker' },
  ],
  ORIGIN,
);

const BULLETS = [
  { icon: Sparkles, text: 'Instant score + concrete fixes you can apply today' },
  { icon: Zap, text: "Keyword and structure signals recruiters' ATS tools look for" },
  { icon: Shield, text: 'No account required — file is analyzed and discarded' },
] as const;

export default function AtsCheckerPage() {
  return (
    <>
      <JsonLdScript id="ats-webapp-ld" data={ATS_WEBAPP_LD} />
      <JsonLdScript id="ats-breadcrumb-ld" data={ATS_BREADCRUMB_LD} />
      <FreeToolPageLayout
        eyebrow="Free tool · no sign-up"
        eyebrowIcon={FileSearch}
        title="Free ATS resume checker"
        description="See if your resume survives Applicant Tracking Systems — score, risks, and fixes in one pass. Add a job description for sharper keyword alignment."
        bullets={BULLETS}
      >
        <AtsCheckerForm />
      </FreeToolPageLayout>
    </>
  );
}
