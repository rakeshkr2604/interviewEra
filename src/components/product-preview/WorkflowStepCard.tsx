import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export type WorkflowStep = {
  step: number;
  title: string;
  description: string;
  icon: LucideIcon;
};

export function WorkflowStepCard({
  step,
  preview,
  emphasized = false,
}: {
  step: WorkflowStep;
  preview: ReactNode;
  emphasized?: boolean;
}) {
  const Icon = step.icon;

  return (
    <li
      className={cn(
        'ie-workflow-step-card ie-lh-surface-92 flex flex-col rounded-2xl border',
        'transition-[transform,box-shadow,border-color] duration-200 motion-reduce:transform-none',
        emphasized ? 'is-emphasized' : 'hover:-translate-y-0.5',
      )}
    >
      <div className="p-3 pb-0 sm:p-4">{preview}</div>
      <div className="px-4 pb-4 pt-3 sm:px-5 sm:pb-5">
        <div className="flex items-center gap-3">
          <span
            className="ie-lh-icon-tile-primary flex size-9 shrink-0 items-center justify-center rounded-xl"
            aria-hidden
          >
            <Icon className="size-4" />
          </span>
          <span className="ie-lh-text-muted font-[family-name:var(--font-jetbrains)] text-[10px] font-semibold uppercase tracking-wider">
            Step {String(step.step).padStart(2, '0')}
          </span>
        </div>
        <h3 className="ie-lh-text-primary mt-3 text-sm font-bold leading-snug tracking-tight sm:text-base">
          {step.title}
        </h3>
        <p className="ie-lh-text-secondary mt-1.5 line-clamp-3 text-xs leading-relaxed sm:text-sm">
          {step.description}
        </p>
      </div>
    </li>
  );
}
