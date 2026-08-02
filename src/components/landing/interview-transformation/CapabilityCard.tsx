import type { InterviewTransformationCapability } from '@/lib/landing/interview-transformation-content';
import { cn } from '@/lib/utils';

type CapabilityCardProps = {
  capability: InterviewTransformationCapability;
};

export function CapabilityCard({ capability }: CapabilityCardProps) {
  const Icon = capability.icon;

  return (
    <article className={cn('ie-it-capability', `ie-it-capability--${capability.tone}`)}>
      <span className="ie-it-capability__icon" aria-hidden>
        <Icon className="size-[1.125rem]" strokeWidth={1.85} />
      </span>
      <div className="ie-it-capability__copy">
        <h3 className="ie-it-capability__title">{capability.title}</h3>
        <p className="ie-it-capability__body">{capability.description}</p>
      </div>
    </article>
  );
}
