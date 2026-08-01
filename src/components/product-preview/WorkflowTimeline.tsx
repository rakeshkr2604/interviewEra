import type { ReactNode } from 'react';
import { WorkflowStepCard, type WorkflowStep } from '@/components/product-preview/WorkflowStepCard';

export function WorkflowTimeline({
  steps,
  previews,
  emphasizedStep,
}: {
  steps: WorkflowStep[];
  previews: ReactNode[];
  emphasizedStep?: number;
}) {
  return (
    <ol
      className="ie-workflow-grid mx-auto mt-12 max-w-6xl list-none p-0"
      aria-label="InterviewEra workflow steps"
    >
      {steps.map((step, index) => (
        <WorkflowStepCard
          key={step.step}
          step={step}
          preview={previews[index]}
          emphasized={emphasizedStep === step.step}
        />
      ))}
    </ol>
  );
}
