import { X } from 'lucide-react';
import { INTERVIEW_TRANSFORMATION_RIBBON } from '@/lib/landing/interview-transformation-content';

/** Before / after — the same question answered two ways. Sample copy, labelled as such. */
export function TransformationRibbon() {
  const { question, disclosure, before, after } = INTERVIEW_TRANSFORMATION_RIBBON;

  return (
    <figure className="ie-it-ribbon m-0" aria-label="Unstructured answer compared with a structured STAR answer">
      <p className="ie-it-ribbon__question">
        <span className="ie-it-ribbon__question-label">Interview question</span>
        {question}
      </p>

      <div className="ie-it-ribbon__panel ie-it-ribbon__panel--before">
        <h3 className="ie-it-ribbon__title">{before.title}</h3>
        <p className="ie-it-ribbon__answer">“{before.answer}”</p>
        <ul className="ie-it-ribbon__issues" aria-label="What is missing">
          {before.issues.map((issue) => (
            <li key={issue}>
              <X className="size-3" strokeWidth={2.5} aria-hidden />
              {issue}
            </li>
          ))}
        </ul>
      </div>

      <div className="ie-it-ribbon__panel ie-it-ribbon__panel--after">
        <h3 className="ie-it-ribbon__title">{after.title}</h3>
        <ol className="ie-it-ribbon__star">
          {after.parts.map((part) => (
            <li key={part.key}>
              <span className="ie-it-ribbon__star-key" aria-hidden>
                {part.key}
              </span>
              <span>
                <span className="ie-it-ribbon__star-label">{part.label}:</span> {part.text}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <figcaption className="ie-it-ribbon__disclosure">{disclosure}</figcaption>
    </figure>
  );
}
