import type { CSSProperties } from 'react';
import { BlurredSection } from '@/components/report/BlurredSection';
import { DIMENSION_KEYS, type DimensionKey } from '@/lib/interview/answer-score/rubric';
import { dimensionLabel, type PerQuestionReportRow } from '@/lib/interview/script-report/aggregate';
import {
  countCoresInRows,
  countFollowUpsInRows,
  groupPerQuestionByCore,
} from '@/lib/interview/script-report/per-question';
import type { PlanTier } from '@/types/app.types';

function scoreColor(score: number): string {
  if (score >= 7) return 'var(--accent-success)';
  if (score >= 5) return 'var(--accent-warning)';
  return 'var(--accent-danger)';
}

function QuestionArticle(props: {
  q: PerQuestionReportRow;
  planTier: PlanTier;
  seeDetails: boolean;
  seePro: boolean;
  nested?: boolean;
}) {
  const { q, planTier, seeDetails, seePro, nested = false } = props;
  const isFollowUp = q.isFollowUp === true;
  const evaluationUnavailable =
    q.evaluationStatus === 'unavailable' || q.overall == null || q.dimensions == null;
  const showDimensionNotes = !evaluationUnavailable && seeDetails && Boolean(q.dimensions);
  const showStarterLock = !evaluationUnavailable && !seeDetails;
  const showRecruiterMiss = seePro && Boolean(q.focusNote) && !evaluationUnavailable;
  /** Answer/model block ends here — evaluation sits below a design-system divider. */
  const showEvaluationBlock = showDimensionNotes || showStarterLock || showRecruiterMiss;
  const coreLabel =
    typeof q.coreSequence === 'number' ? `Q${q.coreSequence}` : `Turn ${q.turnIndex}`;
  const followLabel =
    typeof q.followUpSequence === 'number'
      ? `Follow-up ${q.followUpSequence}`
      : 'Follow-up';

  const nestedStyle: CSSProperties = nested
    ? {
        borderColor: 'color-mix(in srgb, var(--accent-primary) 28%, var(--card-border))',
        background: 'color-mix(in srgb, var(--accent-primary) 5%, transparent)',
        marginLeft: '0.75rem',
      }
    : { borderColor: 'var(--card-border)' };

  return (
    <article
      className={`rounded-xl border-2 p-4 sm:p-5 ${nested ? 'mt-3' : ''}`}
      style={nestedStyle}
      data-testid={isFollowUp ? 'script-report-follow-up' : 'script-report-core-question'}
      data-turn-index={q.turnIndex}
      data-parent-turn-index={q.parentTurnIndex ?? undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
          style={{
            background: isFollowUp
              ? 'color-mix(in srgb, var(--accent-primary) 18%, transparent)'
              : q.questionType === 'technical'
                ? 'color-mix(in srgb, #3b82f6 18%, transparent)'
                : 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
            color: 'var(--text-primary)',
          }}
        >
          {isFollowUp ? followLabel : coreLabel}
        </span>
        {!isFollowUp && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide"
            style={{
              background:
                q.questionType === 'technical'
                  ? 'color-mix(in srgb, #3b82f6 18%, transparent)'
                  : 'color-mix(in srgb, var(--accent-primary) 16%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            {q.questionType}
          </span>
        )}
        {isFollowUp && (
          <span
            className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
            style={{
              background: 'color-mix(in srgb, var(--accent-primary) 12%, transparent)',
              color: 'var(--accent-primary)',
            }}
          >
            Adaptive follow-up
          </span>
        )}
        {evaluationUnavailable ? (
          <span
            className="text-sm font-medium"
            style={{ color: 'var(--text-muted)' }}
            data-testid="script-report-eval-unavailable"
          >
            Evaluation unavailable
          </span>
        ) : (
          <span
            className="text-sm font-semibold tabular-nums"
            style={{ color: scoreColor(Number(q.overall)) }}
          >
            {Number(q.overall).toFixed(1)} / 10
          </span>
        )}
        {q.scoreSuspect && !evaluationUnavailable && (
          <span className="text-xs font-medium" style={{ color: 'var(--accent-warning)' }}>
            Score flagged for review
          </span>
        )}
        {q.answerQualityKind === 'question_echo' && (
          <span
            className="text-xs font-medium"
            style={{ color: 'var(--text-muted)' }}
            data-testid="script-report-question-echo"
          >
            Question repeated — not a substantive answer
          </span>
        )}
      </div>
      <h3
        className="mt-2 text-sm font-semibold sm:text-base"
        style={{ color: 'var(--text-primary)' }}
      >
        {q.question}
      </h3>
      {q.oneLineSummary && seeDetails && !evaluationUnavailable && (
        <p className="mt-2 text-sm italic" style={{ color: 'var(--text-secondary)' }}>
          {q.oneLineSummary}
        </p>
      )}
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Your answer
          </p>
          <p
            className="mt-1 whitespace-pre-wrap text-sm leading-relaxed"
            style={{ color: 'var(--text-secondary)' }}
            data-testid="script-report-transcript"
          >
            {q.transcript || 'No answer recorded.'}
          </p>
        </div>
        <div>
          <p
            className="text-xs font-bold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Model answer example
          </p>
          <BlurredSection
            userTier={planTier}
            requiredTier="pro"
            upgradeLabel="Upgrade to Pro to see model answer comparisons"
          >
            {q.modelAnswerLines.length > 0 ? (
              <p
                className="mt-1 whitespace-pre-wrap text-sm leading-relaxed"
                data-testid="script-report-model-answer"
                style={{ color: 'var(--text-secondary)' }}
              >
                {q.modelAnswerLines.join('\n\n')}
              </p>
            ) : (
              <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
                No example available for this turn.
              </p>
            )}
          </BlurredSection>
        </div>
      </div>
      {showEvaluationBlock && (
        <div
          className="mt-4 border-t pt-4"
          style={{ borderColor: 'var(--card-border)' }}
          data-testid="script-report-answer-eval-divider"
        >
          {showDimensionNotes && q.dimensions && (
            <ul className="grid gap-2 sm:grid-cols-2">
              {DIMENSION_KEYS.map((key) => {
                const d = q.dimensions![key];
                if (!d) return null;
                return (
                  <li key={key} className="text-sm">
                    <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                      {dimensionLabel(key as DimensionKey)} · {Number(d.score).toFixed(1)}
                    </span>
                    {d.note && (
                      <span style={{ color: 'var(--text-secondary)' }}> — {d.note}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {showStarterLock && (
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Dimension notes unlock on Starter.
            </p>
          )}
          {showRecruiterMiss && (
            <p
              className={`text-sm ${showDimensionNotes || showStarterLock ? 'mt-3' : ''}`}
              style={{ color: 'var(--text-secondary)' }}
            >
              <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                Recruiter miss:{' '}
              </span>
              {q.focusNote}
            </p>
          )}
        </div>
      )}
    </article>
  );
}

export function ScriptReportPerQuestion(props: {
  perQuestion: PerQuestionReportRow[];
  planTier: PlanTier;
  seeDetails: boolean;
  seePro: boolean;
}) {
  const { perQuestion, planTier, seeDetails, seePro } = props;
  const groups = groupPerQuestionByCore(perQuestion);
  const coreCount = countCoresInRows(perQuestion);
  const followUpCount = countFollowUpsInRows(perQuestion);

  return (
    <div className="space-y-5" data-testid="script-report-per-question">
      {(coreCount > 0 || followUpCount > 0) && (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }} data-testid="script-report-turn-counts">
          {coreCount} core question{coreCount === 1 ? '' : 's'}
          {followUpCount > 0
            ? ` · ${followUpCount} adaptive follow-up${followUpCount === 1 ? '' : 's'}`
            : ''}
        </p>
      )}
      {groups.map((group) => (
        <div
          key={`core-${group.core.turnIndex}`}
          data-testid="script-report-question-group"
          data-core-turn-index={group.core.turnIndex}
        >
          <QuestionArticle
            q={group.core}
            planTier={planTier}
            seeDetails={seeDetails}
            seePro={seePro}
          />
          {group.followUps.map((fu) => (
            <QuestionArticle
              key={`fu-${fu.turnIndex}`}
              q={fu}
              planTier={planTier}
              seeDetails={seeDetails}
              seePro={seePro}
              nested
            />
          ))}
        </div>
      ))}
    </div>
  );
}
