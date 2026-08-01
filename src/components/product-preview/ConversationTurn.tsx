import { cn } from '@/lib/utils';

/** Mirrors live session / LandingInterviewDemo bubble styling. */
export type ProductPreviewConversationTurn = {
  who: 'interviewer' | 'candidate';
  label: string;
  sublabel?: string;
  text: string;
  highlight?: boolean;
};

export function ConversationTurn({ turn }: { turn: ProductPreviewConversationTurn }) {
  const isInterviewer = turn.who === 'interviewer';
  const isChallenge = Boolean(turn.highlight);

  return (
    <div className={isInterviewer ? 'flex flex-col items-start' : 'flex flex-col items-end'}>
      <div
        className={cn(
          'mb-1 flex flex-col px-1',
          isInterviewer ? 'items-start' : 'items-end',
        )}
      >
        <span
          className={cn(
            'text-[10px] font-bold uppercase tracking-wider',
            isChallenge
              ? 'ie-lh-text-warning'
              : isInterviewer
                ? 'ie-lh-text-accent-hover'
                : 'ie-lh-text-muted',
          )}
        >
          {turn.label}
        </span>
        {turn.sublabel ? (
          <span className="ie-lh-text-warning text-[10px] leading-tight opacity-75">
            {turn.sublabel}
          </span>
        ) : null}
      </div>
      <p
        className={cn(
          'max-w-[95%] rounded-2xl px-3 py-2 text-[13px] leading-relaxed',
          isChallenge
            ? 'ie-lh-bubble-challenge'
            : isInterviewer
              ? 'ie-lh-bubble-interviewer'
              : 'ie-lh-bubble-candidate',
        )}
      >
        {turn.text}
      </p>
    </div>
  );
}
