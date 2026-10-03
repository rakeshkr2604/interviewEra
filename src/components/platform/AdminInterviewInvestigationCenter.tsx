'use client';

import { useMemo, useState, type CSSProperties, type ReactNode } from 'react';
import Link from 'next/link';
import type { AdminInterviewReview } from '@/lib/admin/interview-review';
import {
  buildDiagnosticSummaryText,
  buildInvestigationSummary,
  buildInvestigationTimeline,
  deriveInvestigationStatus,
  filterTimelineEvents,
  formatDurationMs,
  type TimelineFilter,
} from '@/lib/admin/interview-investigation';
import { humanLabelForDiagnosticEvent } from '@/lib/diagnostics/event-contract';

function formatTs(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function MetaItem({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--text-muted)' }}
      >
        {label}
      </dt>
      <dd className="mt-0.5 break-words text-sm" style={{ color: 'var(--text-primary)' }}>
        {value ?? '—'}
      </dd>
    </div>
  );
}

function Section({
  title,
  children,
  action,
}: {
  title: string;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <section
      className="rounded-2xl border p-4 sm:p-5"
      style={{ borderColor: 'var(--card-border)', background: 'var(--card-bg)' }}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const FILTERS: { id: TimelineFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'lifecycle', label: 'Lifecycle' },
  { id: 'turns', label: 'Turns' },
  { id: 'voice', label: 'Voice' },
  { id: 'ai', label: 'AI' },
  { id: 'credits', label: 'Credits' },
  { id: 'feedback', label: 'Feedback' },
  { id: 'diagnostics', label: 'Diagnostics' },
  { id: 'errors', label: 'Warnings/Errors' },
];

function severityStyle(severity: 'info' | 'warning' | 'error'): CSSProperties {
  if (severity === 'error') return { borderColor: '#fecaca', background: '#fef2f2' };
  if (severity === 'warning') return { borderColor: '#fde68a', background: '#fffbeb' };
  return { borderColor: 'var(--card-border)', background: 'transparent' };
}

export function AdminInterviewInvestigationCenter({
  review,
  feedbackId,
}: {
  review: AdminInterviewReview;
  feedbackId?: string | null;
}) {
  const [filter, setFilter] = useState<TimelineFilter>('all');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const timeline = useMemo(() => buildInvestigationTimeline(review), [review]);
  const filtered = useMemo(() => filterTimelineEvents(timeline, filter), [timeline, filter]);
  const summary = useMemo(
    () => buildInvestigationSummary(review, timeline),
    [review, timeline],
  );
  const status = useMemo(() => deriveInvestigationStatus(review), [review]);
  const diagnosticText = useMemo(
    () => buildDiagnosticSummaryText(review, timeline, summary, status),
    [review, timeline, summary, status],
  );

  const { interview, owner, turns, legacy_qa, report, progress } = review;
  const showScriptTurns = turns.length > 0;
  const showLegacy = !showScriptTurns && legacy_qa.length > 0;
  const availableShots = review.visual_evidence.filter(
    (v) => v.type === 'screenshot' && v.availability === 'available',
  );

  async function copySummary() {
    try {
      await navigator.clipboard.writeText(diagnosticText);
      setCopyState('copied');
      window.setTimeout(() => setCopyState('idle'), 2000);
    } catch {
      setCopyState('failed');
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6 sm:px-6">
      {/* A. Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p
            className="text-xs font-semibold uppercase tracking-wide"
            style={{ color: 'var(--text-muted)' }}
          >
            Investigation & resolution center · read-only
          </p>
          <h1 className="mt-1 text-xl font-semibold" style={{ color: 'var(--text-primary)' }}>
            Interview investigation
          </h1>
          <p className="mt-1 font-mono text-xs" style={{ color: 'var(--text-muted)' }}>
            {interview.id}
            {feedbackId ? ` · feedback ${feedbackId}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void copySummary()}
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            {copyState === 'copied'
              ? 'Copied summary'
              : copyState === 'failed'
                ? 'Copy failed'
                : 'Copy diagnostic summary'}
          </button>
          <Link
            href="/platform/feedback"
            className="rounded-md border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
          >
            ← Feedback inbox
          </Link>
        </div>
      </div>

      <Section title="Session header">
        <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MetaItem label="Status" value={interview.status} />
          <MetaItem label="Investigation status" value={`${status.label}`} />
          <MetaItem label="Engine / script" value={`${interview.engine ?? '—'} / ${interview.script_type ?? '—'}`} />
          <MetaItem label="Role / difficulty" value={`${interview.role ?? '—'} / ${interview.difficulty ?? '—'}`} />
          <MetaItem
            label="Credit deducted (flag)"
            value={
              interview.credit_deducted == null
                ? '—'
                : interview.credit_deducted
                  ? 'Yes'
                  : 'No'
            }
          />
          <MetaItem
            label="Credit ledger verified"
            value={summary.credit_transaction_verified ? 'Debit found' : 'Not independently verified'}
          />
          <MetaItem label="Started" value={formatTs(interview.started_at)} />
          <MetaItem label="Ended" value={formatTs(interview.completed_at)} />
          <MetaItem label="Duration" value={formatDurationMs(progress.duration_ms)} />
          <MetaItem
            label="Owner"
            value={
              owner ? (
                <span>
                  {owner.name || 'Unnamed'}{' '}
                  <span style={{ color: 'var(--text-muted)' }}>
                    ({owner.email || owner.id})
                  </span>
                </span>
              ) : (
                interview.user_id
              )
            }
          />
          <MetaItem
            label="Resume history"
            value={
              interview.abandoned_resumed_at
                ? `Resumed ${formatTs(interview.abandoned_resumed_at)}${
                    interview.abandoned_resume_used ? ' · allowance used' : ''
                  }`
                : 'No resume recorded'
            }
          />
          <MetaItem
            label="Linked feedback"
            value={
              review.linked_feedback.length
                ? `${review.linked_feedback.length} record(s)`
                : 'None'
            }
          />
        </dl>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          Status source: {status.source}. Severity/root-cause labels are not invented here.
        </p>
      </Section>

      {/* B. Summary */}
      <Section title="Investigation summary">
        {summary.evidence_completeness === 'insufficient' ? (
          <p className="rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#fcd34d', background: '#fffbeb', color: '#92400e' }}>
            Insufficient diagnostic evidence
          </p>
        ) : null}
        <dl className="mt-3 grid gap-4 sm:grid-cols-2">
          <MetaItem label="Last lifecycle stage" value={summary.last_lifecycle_stage} />
          <MetaItem label="Last known event" value={summary.last_known_event} />
          <MetaItem label="First observed failure" value={summary.first_observed_failure ?? 'None in durable records'} />
          <MetaItem label="Abandonment reason (explicit)" value={summary.abandonment_reason ?? 'Not recorded'} />
          <MetaItem label="Persisted / answered turns" value={`${summary.total_persisted_turns} / ${summary.answered_turns}`} />
          <MetaItem label="API / provider errors" value={summary.api_error_count} />
          <MetaItem label="Visual evidence" value={summary.visual_evidence_count} />
          <MetaItem label="Recording / replay" value="Unavailable in-product" />
        </dl>
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {summary.evidence_note}
        </p>
      </Section>

      {/* C. Timeline */}
      <Section
        title="Event timeline"
        action={
          <div className="flex flex-wrap gap-1">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFilter(f.id)}
                className="rounded-md border px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  borderColor: filter === f.id ? '#6366f1' : 'var(--card-border)',
                  background: filter === f.id ? '#eef2ff' : 'transparent',
                  color: filter === f.id ? '#4338ca' : 'var(--text-muted)',
                }}
              >
                {f.label}
              </button>
            ))}
          </div>
        }
      >
        {filtered.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No durable timeline events for this filter. Missing steps are not fabricated.
          </p>
        ) : (
          <ol className="space-y-2">
            {filtered.map((event) => {
              const open = Boolean(expanded[event.id]);
              return (
                <li
                  key={event.id}
                  className="rounded-xl border p-3"
                  style={severityStyle(event.severity)}
                >
                  <button
                    type="button"
                    className="flex w-full items-start justify-between gap-2 text-left"
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [event.id]: !prev[event.id] }))
                    }
                  >
                    <div>
                      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                        {formatTs(event.timestamp)} · {event.category}
                        {event.severity !== 'info' ? ` · ${event.severity}` : ''}
                      </div>
                      <div className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                        {event.name}
                      </div>
                    </div>
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                      {open ? 'Hide' : 'Details'}
                    </span>
                  </button>
                  {open ? (
                    <div className="mt-2 space-y-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                      <p>Source: {event.source}</p>
                      {event.detail ? <p>{event.detail}</p> : null}
                      {event.correlation_id ? (
                        <p className="font-mono">Correlation: {event.correlation_id}</p>
                      ) : null}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>
        )}
      </Section>

      {/* D. Session / answers */}
      <Section title="Session & answer inspection">
        {!progress.has_report ? (
          <p className="mb-3 rounded-lg border px-3 py-2 text-sm" style={{ borderColor: '#fcd34d', background: '#fffbeb', color: '#92400e' }}>
            No completed report is available. Showing persisted questions/answers only — scores are not fabricated.
          </p>
        ) : null}
        {report ? (
          <p className="mb-3 text-xs" style={{ color: 'var(--text-muted)' }}>
            Report {report.id} · {report.status} · overall {report.overall ?? '—'} · band{' '}
            {report.score_band ?? '—'}
          </p>
        ) : null}
        {showScriptTurns ? (
          <ol className="space-y-3">
            {turns.map((turn) => (
              <li
                key={turn.turn_index}
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  <span>Turn {turn.turn_index}</span>
                  {turn.phase ? <span>· {turn.phase}</span> : null}
                  <span>· delivered: {turn.delivery_state}</span>
                  <span>· answer: {turn.answer_state}</span>
                  <span>
                    · evaluated:{' '}
                    {turn.evaluation ? turn.evaluation.status ?? 'recorded' : 'not evaluated'}
                  </span>
                  {turn.created_at ? <span>· {formatTs(turn.created_at)}</span> : null}
                </div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                  {turn.question_text ||
                    (turn.is_question ? '(Question text unavailable)' : '(Non-question turn)')}
                </p>
                <div className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {turn.answer_text ? (
                    <>
                      <span className="font-semibold" style={{ color: 'var(--text-muted)' }}>
                        Answer ·{' '}
                      </span>
                      {turn.answer_text}
                    </>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>No answer submitted</span>
                  )}
                </div>
                {turn.evaluation ? (
                  <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                    Evaluation {turn.evaluation.status ?? '—'}
                    {turn.evaluation.overall != null ? ` · overall ${turn.evaluation.overall}` : ''}
                    {turn.evaluation.stt_min_confidence != null
                      ? ` · stt_min_confidence ${turn.evaluation.stt_min_confidence}`
                      : ''}
                    {turn.evaluation.score_suspect ? ' · score_suspect' : ''}
                  </p>
                ) : null}
              </li>
            ))}
          </ol>
        ) : showLegacy ? (
          <ol className="space-y-3">
            {legacy_qa.map((qa) => (
              <li
                key={qa.order_index}
                className="rounded-xl border p-3"
                style={{ borderColor: 'var(--card-border)' }}
              >
                <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>
                  Question {qa.order_index + 1}
                  {qa.answered_at ? ` · answered ${formatTs(qa.answered_at)}` : ' · answer missing'}
                </div>
                <p className="text-sm font-medium">{qa.question_text || '(Empty question)'}</p>
                <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {qa.answer_text ?? 'No answer submitted'}
                </p>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No questions or answers were persisted for this interview.
          </p>
        )}
      </Section>

      {/* E. Diagnostics */}
      <Section title="Structured diagnostic events">
        {(review.diagnostic_events?.length ?? 0) === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No diagnostic events were captured for this session. Missing telemetry is not proof of a
            healthy session (browser crash, offline, blocked requests, or pre-instrumentation
            history).
          </p>
        ) : (
          <ul className="space-y-2">
            {review.diagnostic_events.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border p-3 text-sm"
                style={severityStyle(d.severity)}
              >
                <div className="font-semibold">{humanLabelForDiagnosticEvent(d.event_type)}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTs(d.occurred_at)}
                  {d.recorded_at && d.recorded_at !== d.occurred_at
                    ? ` (recorded ${formatTs(d.recorded_at)})`
                    : ''}
                  {` · ${d.severity} · source=${d.source} · ${d.confirmation.replace('_', ' ')}`}
                  {d.error_code ? ` · ${d.error_code}` : ''}
                  {d.turn_index != null ? ` · turn ${d.turn_index}` : ''}
                </div>
                {d.confirmation === 'client_reported' ? (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Client-reported — not independently server-verified. Missing events ≠ healthy
                    session.
                  </p>
                ) : (
                  <p className="mt-1 text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    Server-confirmed diagnostic write.
                  </p>
                )}
                {d.correlation_id ? (
                  <button
                    type="button"
                    className="mt-1 font-mono text-[11px] underline"
                    onClick={() => void navigator.clipboard.writeText(d.correlation_id ?? '')}
                  >
                    Copy correlation: {d.correlation_id}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Provider failure rows (AI / voice logs)">
        {review.diagnostics.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No durable AI/voice failure rows for this interview.
          </p>
        ) : (
          <ul className="space-y-2">
            {review.diagnostics.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border p-3 text-sm"
                style={{ borderColor: '#fecaca', background: '#fef2f2' }}
              >
                <div className="font-semibold">{d.message}</div>
                <div className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTs(d.timestamp)} · {d.source}
                  {d.error_code ? ` · code ${d.error_code}` : ''}
                  {d.retry_count != null ? ` · retries ${d.retry_count}` : ''}
                </div>
                {d.correlation_id ? (
                  <button
                    type="button"
                    className="mt-1 font-mono text-[11px] underline"
                    onClick={() => void navigator.clipboard.writeText(d.correlation_id ?? '')}
                  >
                    Copy correlation: {d.correlation_id}
                  </button>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* F. Visual evidence */}
      <Section title="Visual evidence">
        {availableShots.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No visual evidence was captured for this session.
          </p>
        ) : (
          <ul className="space-y-2">
            {availableShots.map((shot) => (
              <li key={shot.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--card-border)' }}>
                <div className="font-semibold">Screenshot · {shot.source}</div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTs(shot.capture_timestamp)} · {shot.availability}
                </div>
                {shot.url ? (
                  <a
                    href={shot.url}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 inline-block text-xs font-semibold text-indigo-700 underline"
                  >
                    Open artifact
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Session replay is not available in-product. Clarity (if enabled) is an external dashboard
          and is not linked by interview id. Historical screenshots are not invented.
        </p>
      </Section>

      {/* G. Credit audit */}
      <Section title="Credit & lifecycle audit">
        <dl className="grid gap-4 sm:grid-cols-2">
          <MetaItem
            label="interviews.credit_deducted"
            value={String(interview.credit_deducted)}
          />
          <MetaItem
            label="Ledger debit verified"
            value={summary.credit_transaction_verified ? 'Yes (interview_start)' : 'No matching debit row'}
          />
        </dl>
        {review.credit_transactions.length === 0 ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>
            Deduction cannot be independently verified from credit_transactions for this interview.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {review.credit_transactions.map((tx) => (
              <li key={tx.id} className="rounded-lg border px-3 py-2 text-sm font-mono" style={{ borderColor: 'var(--card-border)' }}>
                {tx.id} · {tx.type} · {tx.amount} · {tx.reason ?? '—'} · {formatTs(tx.created_at)}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>
          {review.credit_policy_context}
        </p>
        {review.technical_failure_case ? (
          <p className="mt-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
            Technical failure case {review.technical_failure_case.id}:{' '}
            {review.technical_failure_case.failure_category} ·{' '}
            {review.technical_failure_case.status}. Credit restore actions remain on the Feedback
            Inbox / technical-failure admin flow — not on this page.
          </p>
        ) : null}
      </Section>

      {/* Linked feedback + safe actions */}
      <Section title="Linked feedback & safe actions">
        {review.linked_feedback.length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            No linked interview/exit/platform feedback rows for this interview.
          </p>
        ) : (
          <ul className="space-y-2">
            {review.linked_feedback.map((fb) => (
              <li key={fb.id} className="rounded-xl border p-3 text-sm" style={{ borderColor: 'var(--card-border)' }}>
                <div className="font-semibold">
                  {fb.source} · {fb.id}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {formatTs(fb.created_at)}
                  {fb.exit_reason ? ` · ${fb.exit_reason}` : ''}
                  {fb.issue_type ? ` · ${fb.issue_type}` : ''}
                  {fb.severity ? ` · severity ${fb.severity}` : ''}
                  {` · ${fb.is_resolved ? 'resolved' : 'open'}`}
                </div>
                {fb.device_info ? (
                  <pre className="mt-2 max-h-32 overflow-auto rounded bg-zinc-50 p-2 text-[11px] dark:bg-zinc-900">
                    {JSON.stringify(fb.device_info, null, 2)}
                  </pre>
                ) : null}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 rounded-lg border px-3 py-2 text-xs" style={{ borderColor: 'var(--card-border)', color: 'var(--text-muted)' }}>
          Safe actions in this phase: copy diagnostic summary, review evidence, open Feedback Inbox
          for triage. No credit restore, email send, resume, or session mutation from this page.
          Response drafts / investigation notes schema are deferred (Phase 4–5).
        </div>
      </Section>

      {/* Session context */}
      {interview.session_context ? (
        <Section title="Interview session_context (config)">
          <pre className="max-h-48 overflow-auto rounded-lg bg-zinc-50 p-3 text-[11px] dark:bg-zinc-900">
            {JSON.stringify(interview.session_context, null, 2)}
          </pre>
        </Section>
      ) : null}
    </div>
  );
}
