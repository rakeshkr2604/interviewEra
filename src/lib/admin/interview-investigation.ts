/**
 * Pure helpers for the Admin Interview Investigation Center.
 * Builds timelines / summaries from already-loaded durable evidence.
 * Never invents missing events or root causes.
 */

import type {
  AdminInterviewReview,
  AdminTimelineEvent,
} from '@/lib/admin/interview-review';

export type TimelineFilter =
  | 'all'
  | 'lifecycle'
  | 'turns'
  | 'voice'
  | 'ai'
  | 'credits'
  | 'feedback'
  | 'errors'
  | 'diagnostics';

export interface InvestigationSummary {
  last_lifecycle_stage: string;
  last_known_event: string | null;
  first_observed_failure: string | null;
  abandonment_reason: string | null;
  total_persisted_turns: number;
  answered_turns: number;
  api_error_count: number;
  visual_evidence_count: number;
  recording_replay_available: boolean;
  credit_transaction_verified: boolean;
  evidence_completeness: 'sufficient' | 'partial' | 'insufficient';
  evidence_note: string;
}

export interface DerivedInvestigationStatus {
  label: string;
  source: string;
}

function tsMs(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const n = Date.parse(iso);
  return Number.isNaN(n) ? Number.POSITIVE_INFINITY : n;
}

function sortByTime(a: AdminTimelineEvent, b: AdminTimelineEvent): number {
  const diff = tsMs(a.timestamp) - tsMs(b.timestamp);
  if (diff !== 0) return diff;
  return a.id.localeCompare(b.id);
}

/** Deduplicate identical name+timestamp+source rows (best-effort). */
export function dedupeTimelineEvents(events: AdminTimelineEvent[]): AdminTimelineEvent[] {
  const seen = new Set<string>();
  const out: AdminTimelineEvent[] = [];
  for (const event of events) {
    const key = `${event.timestamp}|${event.name}|${event.source}|${event.category}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(event);
  }
  return out;
}

export function buildInvestigationTimeline(review: AdminInterviewReview): AdminTimelineEvent[] {
  const events: AdminTimelineEvent[] = [];
  const { interview } = review;

  if (interview.started_at) {
    events.push({
      id: `lifecycle-started`,
      timestamp: interview.started_at,
      name: 'Interview started',
      category: 'lifecycle',
      source: 'interviews.started_at',
      severity: 'info',
      detail: `Status transition recorded as ${interview.status ?? 'unknown'}`,
      correlation_id: null,
    });
  }

  if (interview.abandoned_resumed_at) {
    events.push({
      id: `lifecycle-resumed`,
      timestamp: interview.abandoned_resumed_at,
      name: 'Abandoned interview resumed',
      category: 'lifecycle',
      source: 'interviews.abandoned_resumed_at',
      severity: 'info',
      detail: interview.abandoned_resume_used
        ? 'Resume allowance was consumed'
        : 'Resume timestamp present',
      correlation_id: null,
    });
  }

  if (interview.completed_at) {
    const abandoned = interview.status === 'abandoned';
    events.push({
      id: `lifecycle-terminal`,
      timestamp: interview.completed_at,
      name: abandoned ? 'Interview abandoned' : 'Interview completed',
      category: 'lifecycle',
      source: 'interviews.completed_at',
      severity: abandoned ? 'warning' : 'info',
      detail: `Terminal status: ${interview.status ?? 'unknown'}`,
      correlation_id: null,
    });
  }

  for (const tx of review.credit_transactions) {
    events.push({
      id: `credit-${tx.id}`,
      timestamp: tx.created_at,
      name: tx.type === 'debit' ? 'Credit deducted' : 'Credit granted/restored',
      category: 'credits',
      source: 'credit_transactions',
      severity: 'info',
      detail: `${tx.type} · amount ${tx.amount}${tx.reason ? ` · ${tx.reason}` : ''}`,
      correlation_id: tx.id,
    });
  }

  for (const pe of review.product_events) {
    const isErrorish =
      pe.event_name.includes('blocked') ||
      pe.event_name.includes('failed') ||
      pe.event_name.includes('error');
    events.push({
      id: `pe-${pe.id}`,
      timestamp: pe.created_at,
      name: pe.event_name,
      category: 'lifecycle',
      source: 'product_events',
      severity: isErrorish ? 'warning' : 'info',
      detail: summarizeSafeProps(pe.props),
      correlation_id: typeof pe.props.request_id === 'string' ? pe.props.request_id : null,
    });
  }

  for (const turn of review.turns) {
    if (turn.created_at) {
      events.push({
        id: `turn-deliver-${turn.turn_index}`,
        timestamp: turn.created_at,
        name: turn.is_question ? 'Question / turn persisted' : 'Turn persisted',
        category: 'turns',
        source: 'script_turns',
        severity: 'info',
        detail: `turn_index=${turn.turn_index}${turn.phase ? ` · ${turn.phase}` : ''}${
          turn.question_type ? ` · ${turn.question_type}` : ''
        }`,
        correlation_id: String(turn.turn_index),
      });
    }
    if (turn.answer_text && turn.created_at) {
      // Turn row created_at is persistence time; answer may share the same clock.
      events.push({
        id: `turn-answer-${turn.turn_index}`,
        timestamp: turn.created_at,
        name: 'Answer captured on turn',
        category: 'turns',
        source: 'script_turns.answer_text',
        severity: 'info',
        detail: `submitted_as=${turn.submitted_as ?? 'unknown'} · answer length=${turn.answer_text.length}`,
        correlation_id: String(turn.turn_index),
      });
    }
    if (turn.evaluation) {
      events.push({
        id: `turn-eval-${turn.turn_index}`,
        timestamp: turn.evaluation.created_at ?? turn.created_at,
        name:
          turn.evaluation.status === 'failed'
            ? 'Answer evaluation failed'
            : 'Answer evaluation recorded',
        category: 'turns',
        source: 'answer_evaluations',
        severity: turn.evaluation.status === 'failed' || turn.evaluation.score_suspect
          ? 'warning'
          : 'info',
        detail: [
          `status=${turn.evaluation.status ?? 'unknown'}`,
          turn.evaluation.overall != null ? `overall=${turn.evaluation.overall}` : null,
          turn.evaluation.stt_min_confidence != null
            ? `stt_min_confidence=${turn.evaluation.stt_min_confidence}`
            : null,
          turn.evaluation.score_suspect ? 'score_suspect=true' : null,
        ]
          .filter(Boolean)
          .join(' · '),
        correlation_id: String(turn.turn_index),
      });
    }
  }

  for (const log of review.ai_call_logs) {
    if (!log.success) {
      events.push({
        id: `ai-${log.id}`,
        timestamp: log.created_at,
        name: 'AI provider call failed',
        category: 'ai',
        source: 'ai_call_logs',
        severity: 'error',
        detail: `${log.operation} · ${log.provider}/${log.model}${
          log.error_category ? ` · ${log.error_category}` : ''
        }${log.error_code ? ` · ${log.error_code}` : ''}`,
        correlation_id: log.session_id,
      });
    }
  }

  for (const log of review.voice_logs) {
    events.push({
      id: `voice-${log.id}`,
      timestamp: log.created_at,
      name: log.success
        ? `${log.voice_type.toUpperCase()} call succeeded`
        : `${log.voice_type.toUpperCase()} call failed`,
      category: 'voice',
      source: 'voice_usage_logs',
      severity: log.success ? 'info' : 'error',
      detail: `${log.provider}${log.error_category ? ` · ${log.error_category}` : ''}${
        log.latency_ms != null ? ` · ${log.latency_ms}ms` : ''
      }`,
      correlation_id: log.session_id,
    });
  }

  for (const fb of review.linked_feedback) {
    events.push({
      id: `feedback-${fb.id}`,
      timestamp: fb.created_at,
      name: `Feedback recorded (${fb.source})`,
      category: 'feedback',
      source: fb.source,
      severity: fb.severity === 'critical' || fb.severity === 'high' ? 'warning' : 'info',
      detail: [
        fb.exit_reason ? `exit_reason=${fb.exit_reason}` : null,
        fb.issue_type ? `issue_type=${fb.issue_type}` : null,
        fb.is_resolved ? 'resolved' : 'unresolved',
      ]
        .filter(Boolean)
        .join(' · '),
      correlation_id: fb.id,
    });
  }

  if (review.technical_failure_case) {
    const tfc = review.technical_failure_case;
    events.push({
      id: `tfc-${tfc.id}`,
      timestamp: tfc.submitted_at,
      name: 'Technical failure case submitted',
      category: 'feedback',
      source: 'technical_failure_cases',
      severity: 'warning',
      detail: `${tfc.failure_category} · status=${tfc.status}`,
      correlation_id: tfc.id,
    });
  }

  for (const de of review.diagnostic_events ?? []) {
    events.push({
      id: `diag-${de.id}`,
      timestamp: de.occurred_at,
      name: de.event_type,
      category: 'diagnostics',
      source: `diagnostic:${de.confirmation}`,
      severity: de.severity,
      detail: [
        de.error_code ? `code=${de.error_code}` : null,
        de.turn_index != null ? `turn=${de.turn_index}` : null,
        de.confirmation,
      ]
        .filter(Boolean)
        .join(' · '),
      correlation_id: de.correlation_id,
    });
  }

  return dedupeTimelineEvents(events).sort(sortByTime);
}

function summarizeSafeProps(props: Record<string, unknown>): string | null {
  const keys = ['source', 'reason', 'milestone', 'platform', 'browser', 'engine', 'status'];
  const parts: string[] = [];
  for (const key of keys) {
    const val = props[key];
    if (typeof val === 'string' && val.trim()) parts.push(`${key}=${val.trim()}`);
    if (typeof val === 'number' && Number.isFinite(val)) parts.push(`${key}=${val}`);
  }
  return parts.length ? parts.join(' · ') : null;
}

export function filterTimelineEvents(
  events: AdminTimelineEvent[],
  filter: TimelineFilter,
): AdminTimelineEvent[] {
  if (filter === 'all') return events;
  if (filter === 'errors') {
    return events.filter((e) => e.severity === 'error' || e.severity === 'warning');
  }
  if (filter === 'voice') {
    return events.filter(
      (e) =>
        e.category === 'voice' ||
        (e.category === 'diagnostics' &&
          /mic_|stt_|tts_|voice_/.test(e.name)),
    );
  }
  if (filter === 'diagnostics') {
    return events.filter((e) => e.category === 'diagnostics');
  }
  return events.filter((e) => e.category === filter);
}

export function deriveInvestigationStatus(
  review: AdminInterviewReview,
): DerivedInvestigationStatus {
  const tfc = review.technical_failure_case;
  if (tfc) {
    return {
      label: `Tech case · ${tfc.status}`,
      source: 'technical_failure_cases.status',
    };
  }
  const unresolved = review.linked_feedback.find((f) => !f.is_resolved && !f.is_archived);
  if (unresolved) {
    return {
      label: 'Feedback open',
      source: `${unresolved.source}.is_resolved=false`,
    };
  }
  if (review.linked_feedback.some((f) => f.is_resolved)) {
    return {
      label: 'Feedback resolved',
      source: 'linked feedback triage',
    };
  }
  return {
    label: 'No linked triage case',
    source: 'derived (no investigation_status column)',
  };
}

export function buildInvestigationSummary(
  review: AdminInterviewReview,
  timeline: AdminTimelineEvent[],
): InvestigationSummary {
  const lastLifecycle = [...timeline].reverse().find((e) => e.category === 'lifecycle');
  const lastEvent = timeline.length ? timeline[timeline.length - 1] : null;
  const firstFailure = timeline.find((e) => e.severity === 'error' || e.severity === 'warning');
  const exit = review.linked_feedback.find((f) => f.source === 'exit');
  const apiErrors = review.diagnostics.filter((d) => d.category === 'ai' || d.category === 'voice');
  const availableVisual = review.visual_evidence.filter(
    (v) => v.availability === 'available' && v.type === 'screenshot',
  );
  const creditVerified = review.credit_transactions.some(
    (t) => t.type === 'debit' && t.reason === 'interview_start',
  );

  let completeness: InvestigationSummary['evidence_completeness'] = 'partial';
  let evidence_note =
    'Partial durable evidence is available. Client console / Vercel log stream / Clarity are not joined here.';

  const hasLifecycle = Boolean(review.interview.started_at);
  const hasTurns = review.turns.length > 0 || review.legacy_qa.length > 0;
  const hasTelemetry =
    review.product_events.length > 0 ||
    review.ai_call_logs.length > 0 ||
    review.voice_logs.length > 0;

  if (!hasLifecycle && !hasTurns && !hasTelemetry) {
    completeness = 'insufficient';
    evidence_note = 'Insufficient diagnostic evidence for this session.';
  } else if (hasLifecycle && hasTurns && (hasTelemetry || exit || creditVerified)) {
    completeness = 'sufficient';
    evidence_note =
      'Enough durable records exist for an evidence-based review. Root cause is not asserted automatically.';
  }

  return {
    last_lifecycle_stage: lastLifecycle?.name ?? review.interview.status ?? 'Unknown',
    last_known_event: lastEvent
      ? `${lastEvent.name}${lastEvent.timestamp ? ` @ ${lastEvent.timestamp}` : ''}`
      : null,
    first_observed_failure: firstFailure
      ? `${firstFailure.name}${firstFailure.detail ? ` — ${firstFailure.detail}` : ''}`
      : null,
    abandonment_reason: exit?.exit_reason ?? null,
    total_persisted_turns: review.progress.turn_count,
    answered_turns: review.progress.answered_turn_count,
    api_error_count: apiErrors.length,
    visual_evidence_count: availableVisual.length,
    recording_replay_available: false,
    credit_transaction_verified: creditVerified,
    evidence_completeness: completeness,
    evidence_note,
  };
}

export function buildDiagnosticSummaryText(
  review: AdminInterviewReview,
  timeline: AdminTimelineEvent[],
  summary: InvestigationSummary,
  status: DerivedInvestigationStatus,
): string {
  const lines = [
    'InterviewEra — Admin diagnostic summary (privacy-safe)',
    `Interview ID: ${review.interview.id}`,
    `Status: ${review.interview.status ?? 'unknown'}`,
    `Engine: ${review.interview.engine ?? 'unknown'} · Script: ${review.interview.script_type ?? 'unknown'}`,
    `Role: ${review.interview.role ?? 'unknown'} · Difficulty: ${review.interview.difficulty ?? 'unknown'}`,
    `Owner ref: ${review.owner?.id ?? review.interview.user_id}`,
    `Started: ${review.interview.started_at ?? '—'} · Ended: ${review.interview.completed_at ?? '—'}`,
    `Duration: ${formatDurationMs(review.progress.duration_ms)}`,
    `Investigation status: ${status.label} (${status.source})`,
    `Last lifecycle stage: ${summary.last_lifecycle_stage}`,
    `Last known event: ${summary.last_known_event ?? '—'}`,
    `First observed failure: ${summary.first_observed_failure ?? 'None in durable records'}`,
    `Abandonment reason (explicit): ${summary.abandonment_reason ?? 'Not recorded'}`,
    `Turns: ${summary.total_persisted_turns} persisted · ${summary.answered_turns} answered`,
    `Credit flag (interviews.credit_deducted): ${String(review.interview.credit_deducted)}`,
    `Credit ledger debit verified: ${summary.credit_transaction_verified ? 'yes' : 'no'}`,
    `AI/voice diagnostic errors: ${summary.api_error_count}`,
    `Visual evidence artifacts: ${summary.visual_evidence_count}`,
    `Session replay in-product: unavailable`,
    `Evidence completeness: ${summary.evidence_completeness}`,
    `Note: ${summary.evidence_note}`,
    '',
    'Timeline (durable only):',
    ...timeline.slice(0, 40).map(
      (e) =>
        `- [${e.timestamp ?? 'no-ts'}] ${e.name} · ${e.source}${
          e.severity !== 'info' ? ` · ${e.severity}` : ''
        }`,
    ),
    timeline.length > 40 ? `… ${timeline.length - 40} more events omitted` : '',
    '',
    'Do not treat correlation as root cause. Internal notes and secrets excluded.',
  ];
  return lines.filter((l) => l !== undefined).join('\n');
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return '—';
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
