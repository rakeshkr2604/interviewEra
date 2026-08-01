import {
  BarChart3,
  FileText,
  Lightbulb,
  MessagesSquare,
  Mic,
} from 'lucide-react';
import { WORKFLOW_BENEFITS } from '@/components/product-preview/preview-data';

const BENEFIT_ICONS = {
  file: FileText,
  mic: Mic,
  messages: MessagesSquare,
  chart: BarChart3,
  insight: Lightbulb,
} as const;

/** Five benefit chips — no privacy item (moved elsewhere on the page). */
export function BenefitStrip() {
  return (
    <ul
      className="ie-workflow-benefits mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2 p-0 sm:gap-3"
      aria-label="InterviewEra product benefits"
    >
      {WORKFLOW_BENEFITS.map((benefit) => {
        const Icon = BENEFIT_ICONS[benefit.icon];

        return (
          <li
            key={benefit.id}
            className="ie-lh-surface-94 flex list-none items-center gap-2 rounded-full border px-3 py-2"
          >
            <Icon className="ie-lh-text-accent size-3.5 shrink-0" aria-hidden />
            <span className="ie-lh-text-secondary text-xs font-semibold">{benefit.label}</span>
          </li>
        );
      })}
    </ul>
  );
}
