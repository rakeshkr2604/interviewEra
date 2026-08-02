import { ArrowRight, Check, Minus } from 'lucide-react';
import { INTERVIEW_TRANSFORMATION_RIBBON } from '@/lib/landing/interview-transformation-content';

export function TransformationRibbon() {
  const { before, after } = INTERVIEW_TRANSFORMATION_RIBBON;

  return (
    <div className="ie-it-ribbon" role="group" aria-label="Before and after structured mock interview practice">
      <div className="ie-it-ribbon__panel ie-it-ribbon__panel--before">
        <h3 className="ie-it-ribbon__title">{before.title}</h3>
        <ul className="ie-it-ribbon__list">
          {before.items.map((item) => (
            <li key={item}>
              <span className="ie-it-ribbon__marker ie-it-ribbon__marker--before" aria-hidden>
                <Minus className="size-3.5" strokeWidth={2.25} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ie-it-ribbon__bridge" aria-hidden>
        <span className="ie-it-ribbon__bridge-icon">
          <ArrowRight className="size-4" />
        </span>
      </div>

      <div className="ie-it-ribbon__panel ie-it-ribbon__panel--after">
        <h3 className="ie-it-ribbon__title">{after.title}</h3>
        <ul className="ie-it-ribbon__list">
          {after.items.map((item) => (
            <li key={item}>
              <span className="ie-it-ribbon__marker ie-it-ribbon__marker--after" aria-hidden>
                <Check className="size-3.5" strokeWidth={2.5} />
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
