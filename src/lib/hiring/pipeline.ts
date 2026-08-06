export const HIRING_STAGES = [
  'applied',
  'ai_interview_completed',
  'shortlisted',
  'human_interview',
  'offer',
  'rejected',
] as const;

export type HiringStage = (typeof HIRING_STAGES)[number];

export const HIRING_STAGE_LABELS: Record<HiringStage, string> = {
  applied: 'Applied',
  ai_interview_completed: 'AI Interview Completed',
  shortlisted: 'Shortlisted',
  human_interview: 'Human Interview',
  offer: 'Offer',
  rejected: 'Rejected',
};

/** Active pipeline columns (Rejected is a terminal filter, not a kanban column). */
export const HIRING_PIPELINE_COLUMNS: HiringStage[] = [
  'applied',
  'ai_interview_completed',
  'shortlisted',
  'human_interview',
  'offer',
];

const FORWARD: Partial<Record<HiringStage, HiringStage>> = {
  applied: 'ai_interview_completed',
  ai_interview_completed: 'shortlisted',
  shortlisted: 'human_interview',
  human_interview: 'offer',
};

export function isHiringStage(value: string): value is HiringStage {
  return (HIRING_STAGES as readonly string[]).includes(value);
}

export function nextHiringStage(stage: HiringStage): HiringStage | null {
  return FORWARD[stage] ?? null;
}

export function canMoveToStage(from: HiringStage, to: HiringStage): boolean {
  if (from === to) return true;
  if (to === 'rejected') return from !== 'rejected' && from !== 'offer';
  if (from === 'rejected') return to === 'applied';
  if (to === 'offer') return from === 'human_interview' || from === 'offer';
  return true;
}
