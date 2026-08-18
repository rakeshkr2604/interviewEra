/** Verified homepage trust metrics — update values here without touching JSX. */

export type TrustMetricId = 'candidates' | 'interviews' | 'resume' | 'questions';

/** Maps to landing accent tokens — one hue per metric for quick scanning. */
export type TrustMetricTone = 'primary' | 'success' | 'sky' | 'amber';

export type TrustMetric = {
  id: TrustMetricId;
  tone: TrustMetricTone;
  value: number;
  suffix: string;
  label: string;
  description?: string;
};

/** Aggregate candidate rating shown on the homepage. */
export const CANDIDATE_RATING = {
  value: 4.5,
  outOf: 5,
  label: 'Average Candidate Rating',
} as const;

export const TRUST_METRICS: readonly TrustMetric[] = [
  {
    id: 'candidates',
    tone: 'primary',
    value: 537,
    suffix: '+',
    label: 'Candidates Practiced',
    description: 'Candidates who prepared using InterviewEra.',
  },
  {
    id: 'interviews',
    tone: 'success',
    value: 2143,
    suffix: '+',
    label: 'AI Mock Interviews Completed',
    description: 'Complete interview sessions successfully finished.',
  },
  {
    id: 'resume',
    tone: 'sky',
    value: 5186,
    suffix: '+',
    label: 'ATS Resume Checks',
    description: 'Resumes analyzed using InterviewEra ATS Checker.',
  },
  {
    id: 'questions',
    tone: 'amber',
    value: 8742,
    suffix: '+',
    label: 'Interview Questions Generated',
    description: 'Questions generated using InterviewEra Question Generator.',
  },
] as const;
