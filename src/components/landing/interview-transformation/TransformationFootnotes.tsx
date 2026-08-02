import { INTERVIEW_TRANSFORMATION_FOOTNOTES } from '@/lib/landing/interview-transformation-content';
import { cn } from '@/lib/utils';

export function TransformationFootnotes() {
  return (
    <div className="ie-it-footnotes" role="list">
      {INTERVIEW_TRANSFORMATION_FOOTNOTES.map((item) => {
        const Icon = item.icon;
        return (
          <div key={item.id} className={cn('ie-it-footnote', `ie-it-footnote--${item.tone}`)} role="listitem">
            <span className="ie-it-footnote__icon" aria-hidden>
              <Icon className="size-4" strokeWidth={1.85} />
            </span>
            <div className="ie-it-footnote__copy">
              <p className="ie-it-footnote__title">{item.title}</p>
              <p className="ie-it-footnote__body">{item.description}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
