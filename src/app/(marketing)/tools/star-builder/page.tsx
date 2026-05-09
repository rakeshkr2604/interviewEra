import type { Metadata } from 'next';
import Link from 'next/link';
import { BookOpen, ClipboardCheck, Shield, Sparkles } from 'lucide-react';
import { generateMetadata } from '@/lib/seo/metadata';
import { StarBuilderForm } from './StarBuilderForm';
import { FreeToolPageLayout } from '@/components/landing/FreeToolPageLayout';

export const metadata: Metadata = generateMetadata({
  title: 'STAR answer builder',
  description:
    'Structure your behavioral interview answers using the STAR method. Get a polished, ready-to-use answer with quality scores and improvement tips. Free tool, no sign-up required.',
  path: '/tools/star-builder',
  keywords: [
    'STAR method examples',
    'behavioral interview answers',
    'STAR method interview',
    'how to answer behavioral questions',
    'STAR method template',
    'interview answer builder',
  ],
});

const BULLETS = [
  {
    icon: ClipboardCheck,
    title: 'Interview-ready wording',
    body: 'Turn rough bullets into a tight story recruiters and panels can follow in one listen.',
  },
  {
    icon: BookOpen,
    title: 'Scores + fixes',
    body: 'See structure, specificity, and impact scores with concrete next steps — not generic advice.',
  },
  {
    icon: Shield,
    title: 'Private & free',
    body: 'No account for this tool. Your draft is used only to generate this response — not stored as a profile.',
  },
] as const;

const STAR_LEGEND = [
  { letter: 'S', label: 'Situation', border: 'hsla(199, 89%, 48%, 0.45)', fill: 'hsla(199, 89%, 48%, 0.14)' },
  { letter: 'T', label: 'Task', border: 'hsla(271, 81%, 56%, 0.45)', fill: 'hsla(271, 81%, 56%, 0.14)' },
  { letter: 'A', label: 'Action', border: 'hsla(24, 95%, 53%, 0.45)', fill: 'hsla(24, 95%, 53%, 0.14)' },
  { letter: 'R', label: 'Result', border: 'hsla(152, 69%, 40%, 0.45)', fill: 'hsla(152, 69%, 40%, 0.14)' },
] as const;

export default function StarBuilderPage() {
  return (
    <FreeToolPageLayout
      eyebrow="Free tool · no sign-up"
      eyebrowIcon={Sparkles}
      title="STAR method answer builder"
      description="Turn your Situation → Task → Action → Result notes into a confident spoken answer, with scores and fixes — about two minutes, no sign-up."
      bullets={BULLETS}
      leftSlot={
        <div className="mx-auto grid max-w-md grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3 lg:mx-0 lg:max-w-none">
          {STAR_LEGEND.map(({ letter, label, border, fill }) => (
            <div
              key={letter}
              className="rounded-xl border px-2 py-3 text-center transition-transform duration-200 hover:-translate-y-0.5"
              style={{
                borderColor: border,
                background: fill,
              }}
            >
              <p className="text-xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
                {letter}
              </p>
              <p className="text-[11px] font-semibold leading-tight" style={{ color: 'var(--text-secondary)' }}>
                {label}
              </p>
            </div>
          ))}
        </div>
      }
      footerSlot={
        <p
          className="mx-auto max-w-md text-sm text-left lg:mx-0"
          style={{ color: 'var(--text-muted)' }}
        >
          Next:{' '}
          <Link
            href="/tools/question-generator"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            Interview question generator
          </Link>
          {' · '}
          <Link
            href="/blog/what-is-star-method-with-examples"
            className="font-medium underline-offset-4 transition-colors hover:underline"
            style={{ color: 'var(--accent-primary)' }}
          >
            STAR method guide
          </Link>
        </p>
      }
    >
      <StarBuilderForm />
    </FreeToolPageLayout>
  );
}
