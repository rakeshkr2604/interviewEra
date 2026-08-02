import Link from 'next/link';
import { Plus } from 'lucide-react';
import { COMMUNITY_FAQ_Q } from '@/lib/landing/faq-content';
import { COMMUNITY_HUB_PATH } from '@/lib/community/community';
import { cn } from '@/lib/utils';

function FaqAnswer({ question, answer }: { question: string; answer: string }) {
  if (question === COMMUNITY_FAQ_Q) {
    return (
      <>
        See the{' '}
        <Link
          href={COMMUNITY_HUB_PATH}
          className="ie-lh-text-accent ie-lh-inline-link-focus font-semibold underline-offset-2 hover:underline"
        >
          Community Hub
        </Link>{' '}
        for WhatsApp groups, job-alert channels, and social links.
      </>
    );
  }
  return <>{answer}</>;
}

type LandingFaqAccordionItemProps = {
  question: string;
  answer: string;
  defaultOpen?: boolean;
  panelId: string;
  isLast?: boolean;
};

export function LandingFaqAccordionItem({
  question,
  answer,
  defaultOpen = false,
  panelId,
  isLast = false,
}: LandingFaqAccordionItemProps) {
  return (
    <details
      id={panelId}
      className={cn(
        'landing-faq-accordion group',
        !isLast && 'landing-faq-accordion--divided',
        'transition-[background-color] duration-200',
        'open:bg-[color-mix(in_srgb,var(--accent-primary)_4%,var(--card-bg))]',
      )}
      {...(defaultOpen ? { open: true } : {})}
    >
      <summary
        className={cn(
          'landing-faq-accordion__summary',
          'flex cursor-pointer list-none items-center justify-between gap-5 px-5 py-[1.125rem] sm:px-6 sm:py-5',
          'text-[15px] font-semibold leading-snug text-[var(--text-primary)] sm:text-base',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset',
          'focus-visible:ring-[color-mix(in_srgb,var(--accent-primary)_40%,transparent)]',
        )}
      >
        <span className="min-w-0 pr-2">{question}</span>
        <span
          className={cn(
            'flex size-8 shrink-0 items-center justify-center rounded-full border transition-colors duration-200',
            'border-[color-mix(in_srgb,var(--card-border)_85%,transparent)]',
            'bg-[color-mix(in_srgb,var(--bg-secondary)_60%,transparent)]',
            'group-open:border-[color-mix(in_srgb,var(--accent-primary)_28%,var(--card-border))]',
            'group-open:bg-[color-mix(in_srgb,var(--accent-primary)_12%,transparent)]',
          )}
          aria-hidden
        >
          <Plus className="landing-faq-accordion__icon size-4 text-[var(--accent-hover)]" />
        </span>
      </summary>
      <div className="landing-faq-accordion__answer px-5 pb-5 sm:px-6 sm:pb-6">
        <p className="text-sm leading-relaxed text-[var(--text-secondary)] sm:text-[15px] sm:leading-[1.65]">
          <FaqAnswer question={question} answer={answer} />
        </p>
      </div>
    </details>
  );
}
