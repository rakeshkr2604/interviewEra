import { ShieldCheck } from 'lucide-react';
import { INTERVIEW_TRANSFORMATION_TRUST } from '@/lib/landing/interview-transformation-content';

export function TrustStatement() {
  return (
    <blockquote className="ie-it-trust">
      <span className="ie-it-trust__icon" aria-hidden>
        <ShieldCheck className="size-5" strokeWidth={1.85} />
      </span>
      <div className="ie-it-trust__copy">
        <p className="ie-it-trust__lead">{INTERVIEW_TRANSFORMATION_TRUST.lead}</p>
        <p className="ie-it-trust__emphasis">
          {INTERVIEW_TRANSFORMATION_TRUST.emphasisLead}{' '}
          <span className="ie-it-trust__accent">{INTERVIEW_TRANSFORMATION_TRUST.emphasisAccent}</span>
          {INTERVIEW_TRANSFORMATION_TRUST.emphasisTail}
        </p>
      </div>
    </blockquote>
  );
}
