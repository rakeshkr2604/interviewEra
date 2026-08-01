import type { LucideIcon } from 'lucide-react';
import { BarChart3, FileUp, MessagesSquare, Mic } from 'lucide-react';
import { BenefitStrip } from '@/components/product-preview/BenefitStrip';
import { FeedbackReportPreview } from '@/components/product-preview/FeedbackReportPreview';
import { FollowUpPreview } from '@/components/product-preview/FollowUpPreview';
import { ResumePreview } from '@/components/product-preview/ResumePreview';
import { VoiceInterviewPreview } from '@/components/product-preview/VoiceInterviewPreview';
import { WorkflowTimeline } from '@/components/product-preview/WorkflowTimeline';
import type { WorkflowStep } from '@/components/product-preview/WorkflowStepCard';
import {
  LANDING_HOME_EYEBROW,
  LANDING_HOME_HEADER_BLOCK,
  LANDING_HOME_HEADING,
  LANDING_HOME_SECTION,
  LANDING_HOME_SUBHEAD,
  LANDING_PAGE_CONTAINER,
} from '@/lib/landing/container';
import { cn } from '@/lib/utils';

/**
 * How It Works — visual product walkthrough with extracted preview components.
 * Server-rendered (no client JS).
 */

// ── Founder copy surface — edit strings here only ─────────────────────────────

const HOW_IT_WORKS_EYEBROW = 'How InterviewEra works';

const HOW_IT_WORKS_HEADING =
  'Practice a real interview in minutes — not another chatbot conversation.';

const HOW_IT_WORKS_SUBHEAD =
  'Upload your resume, answer by voice in a Mock Interview, handle Adaptive Follow-up Questions, and receive Answer Feedback plus an Interview Report before your next round.';

type HowItWorksStepIcon = 'upload' | 'mic' | 'probe' | 'trend';

const STEP_1_TITLE = 'Upload your resume';
const STEP_1_BODY =
  'Your Mock Interview starts with your actual resume, so every question is relevant to your projects, skills, and experience.';

const STEP_2_TITLE = 'Take a voice-first Mock Interview';
const STEP_2_BODY =
  'Answer questions out loud under interview pacing instead of typing responses into a chatbot.';

const STEP_3_TITLE = 'Handle Adaptive Follow-up Questions';
const STEP_3_BODY =
  'Weak, incomplete, or vague answers trigger deeper questions, just like a real interviewer trying to understand your thinking.';

const STEP_4_TITLE = 'Receive your Interview Report';
const STEP_4_BODY =
  'See Answer Feedback on every response, understand where you struggled, and get an Interview Report when the session ends.';

const STEP_ICONS: Record<HowItWorksStepIcon, LucideIcon> = {
  upload: FileUp,
  mic: Mic,
  probe: MessagesSquare,
  trend: BarChart3,
};

const HOW_IT_WORKS_STEPS: WorkflowStep[] = [
  {
    step: 1,
    title: STEP_1_TITLE,
    description: STEP_1_BODY,
    icon: STEP_ICONS.upload,
  },
  {
    step: 2,
    title: STEP_2_TITLE,
    description: STEP_2_BODY,
    icon: STEP_ICONS.mic,
  },
  {
    step: 3,
    title: STEP_3_TITLE,
    description: STEP_3_BODY,
    icon: STEP_ICONS.probe,
  },
  {
    step: 4,
    title: STEP_4_TITLE,
    description: STEP_4_BODY,
    icon: STEP_ICONS.trend,
  },
];

const WORKFLOW_PREVIEWS = [
  <ResumePreview key="resume" />,
  <VoiceInterviewPreview key="voice" />,
  <FollowUpPreview key="followup" />,
  <FeedbackReportPreview key="feedback" />,
];

/** Step 2 (Meet Meera) — brand focal point in the walkthrough. */
const WORKFLOW_EMPHASIZED_STEP = 2;

export function LandingHowItWorks() {
  return (
    <section
      className={cn(LANDING_HOME_SECTION, 'landing-how-it-works')}
      aria-labelledby="landing-how-it-works-heading"
    >
      <div className={LANDING_PAGE_CONTAINER}>
        <div className={LANDING_HOME_HEADER_BLOCK}>
          <span className={LANDING_HOME_EYEBROW}>{HOW_IT_WORKS_EYEBROW}</span>
          <h2 id="landing-how-it-works-heading" className={LANDING_HOME_HEADING}>
            {HOW_IT_WORKS_HEADING}
          </h2>
          <p className={cn(LANDING_HOME_SUBHEAD, 'sm:text-[17px]')}>{HOW_IT_WORKS_SUBHEAD}</p>
        </div>

        <WorkflowTimeline
          steps={HOW_IT_WORKS_STEPS}
          previews={WORKFLOW_PREVIEWS}
          emphasizedStep={WORKFLOW_EMPHASIZED_STEP}
        />

        <BenefitStrip />
      </div>
    </section>
  );
}
