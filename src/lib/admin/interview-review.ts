/**
 * Read-only admin interview investigation loader.
 *
 * Used by GET /api/admin/interviews/[id] and /platform/feedback/interview/[id].
 * Joins existing durable tables only — no new schema, no AI/voice provider calls,
 * no credit mutations.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isInterviewId(value: string): boolean {
  return UUID_RE.test(value);
}

/** Dedicated admin review path — never student session/report routes. */
export function adminInterviewReviewPath(interviewId: string): string {
  return `/platform/feedback/interview/${interviewId}`;
}

/**
 * Feedback inbox "View interview" destination.
 * Always uses the interview id; report_id / engine labels do not change routing.
 */
export function feedbackViewInterviewHref(
  interviewId: string | null | undefined,
): string | null {
  if (!interviewId || !isInterviewId(interviewId)) return null;
  return adminInterviewReviewPath(interviewId);
}

export interface AdminInterviewOwner {
  id: string;
  email: string | null;
  name: string | null;
}

export interface AdminInterviewTurnView {
  turn_index: number;
  phase: string | null;
  is_question: boolean;
  question_type: string | null;
  question_text: string | null;
  answer_text: string | null;
  raw_transcript: string | null;
  submitted_as: string | null;
  timer_seconds: number | null;
  created_at: string | null;
  /** Distinct states — not equivalent. */
  delivery_state: 'persisted' | 'unknown';
  answer_state: 'captured' | 'missing';
  evaluation: {
    status: string | null;
    overall: number | null;
    question_type: string | null;
    stt_min_confidence: number | null;
    score_suspect: boolean | null;
    created_at: string | null;
  } | null;
}

export interface AdminLegacyQaView {
  order_index: number;
  question_text: string;
  answer_text: string | null;
  answered_at: string | null;
}

export interface AdminScriptReportSummary {
  id: string;
  status: string | null;
  overall: number | null;
  score_band: string | null;
  scored_answer_count: number | null;
  generated_at: string | null;
}

export interface AdminCreditTransactionView {
  id: string;
  type: string;
  amount: number;
  reason: string | null;
  created_at: string | null;
}

export interface AdminProductEventView {
  id: string;
  event_name: string;
  created_at: string | null;
  props: Record<string, unknown>;
}

export interface AdminAiCallLogView {
  id: string;
  operation: string;
  provider: string;
  model: string;
  success: boolean;
  error_category: string | null;
  error_code: string | null;
  retries: number | null;
  latency_ms: number | null;
  session_id: string | null;
  user_agent: string | null;
  created_at: string | null;
}

export interface AdminVoiceLogView {
  id: string;
  provider: string;
  voice_type: string;
  success: boolean;
  error_category: string | null;
  latency_ms: number | null;
  session_id: string | null;
  created_at: string | null;
}

export interface AdminFeedbackLinkView {
  id: string;
  source: 'platform' | 'interview' | 'exit';
  created_at: string | null;
  severity: string | null;
  exit_reason: string | null;
  issue_type: string | null;
  is_resolved: boolean;
  is_archived: boolean;
  is_read: boolean;
  notes: string | null;
  screenshot_url: string | null;
  device_info: Record<string, unknown> | null;
  progress_percent: number | null;
  question_index: number | null;
}

export interface AdminTechnicalFailureView {
  id: string;
  feedback_id: string;
  failure_category: string;
  status: string;
  submitted_at: string | null;
  resolved_at: string | null;
  reviewed_by_email: string | null;
  decision_reason: string | null;
  original_debit_transaction_id: string | null;
  restoration_transaction_id: string | null;
}

export interface AdminVisualEvidenceView {
  id: string;
  type: 'screenshot' | 'replay';
  capture_timestamp: string | null;
  source: string;
  availability: 'available' | 'unavailable';
  retention_note: string | null;
  /** Present only when availability=available and admin-authenticated fetch is used. */
  url: string | null;
}

export interface AdminDiagnosticErrorView {
  id: string;
  category: 'ai' | 'voice' | 'other';
  error_code: string | null;
  message: string;
  timestamp: string | null;
  source: string;
  http_status: number | null;
  correlation_id: string | null;
  retry_count: number | null;
  browser_context: string | null;
}

export interface AdminDiagnosticEventView {
  id: string;
  event_type: string;
  occurred_at: string | null;
  recorded_at: string | null;
  source: string;
  severity: 'info' | 'warning' | 'error';
  error_code: string | null;
  correlation_id: string | null;
  turn_index: number | null;
  confirmation: 'client_reported' | 'server_confirmed';
  metadata: Record<string, string | number | boolean>;
}

export interface AdminTimelineEvent {
  id: string;
  timestamp: string | null;
  name: string;
  category: 'lifecycle' | 'turns' | 'voice' | 'ai' | 'credits' | 'feedback' | 'diagnostics';
  source: string;
  severity: 'info' | 'warning' | 'error';
  detail: string | null;
  correlation_id: string | null;
}

export interface AdminInterviewReview {
  interview: {
    id: string;
    user_id: string;
    role: string | null;
    difficulty: string | null;
    engine: string | null;
    script_type: string | null;
    status: string | null;
    started_at: string | null;
    completed_at: string | null;
    created_at: string | null;
    current_turn_index: number | null;
    credit_deducted: boolean | null;
    abandoned_resume_used: boolean | null;
    abandoned_resumed_at: string | null;
    skips_used: number | null;
    max_skips: number | null;
    session_context: Record<string, unknown> | null;
  };
  owner: AdminInterviewOwner | null;
  turns: AdminInterviewTurnView[];
  legacy_qa: AdminLegacyQaView[];
  report: AdminScriptReportSummary | null;
  credit_transactions: AdminCreditTransactionView[];
  product_events: AdminProductEventView[];
  ai_call_logs: AdminAiCallLogView[];
  voice_logs: AdminVoiceLogView[];
  linked_feedback: AdminFeedbackLinkView[];
  technical_failure_case: AdminTechnicalFailureView | null;
  visual_evidence: AdminVisualEvidenceView[];
  diagnostics: AdminDiagnosticErrorView[];
  diagnostic_events: AdminDiagnosticEventView[];
  credit_policy_context: string;
  progress: {
    turn_count: number;
    answered_turn_count: number;
    evaluation_count: number;
    has_report: boolean;
    duration_ms: number | null;
  };
}

type LlmOutput = Record<string, unknown> | null;

export function extractTurnQuestionText(llmOutput: unknown): string | null {
  if (!llmOutput || typeof llmOutput !== 'object' || Array.isArray(llmOutput)) {
    return null;
  }
  const obj = llmOutput as LlmOutput & Record<string, unknown>;
  const display = obj.display_question;
  if (typeof display === 'string' && display.trim()) return display.trim();
  const speech = obj.speech;
  if (typeof speech === 'string' && speech.trim()) return speech.trim();
  return null;
}

export function extractTurnAnswerText(
  answerText: unknown,
  rawTranscript: unknown,
): string | null {
  if (typeof answerText === 'string' && answerText.trim()) return answerText.trim();
  if (typeof rawTranscript === 'string' && rawTranscript.trim()) {
    return rawTranscript.trim();
  }
  return null;
}

function asNullableString(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function asNullableNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function asNullableBoolean(value: unknown): boolean | null {
  return typeof value === 'boolean' ? value : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const ADMIN_DIAG_META_KEYS = new Set([
  'error_code',
  'component',
  'retry_count',
  'http_status',
  'elapsed_ms',
  'browser',
  'platform',
  'network_state',
  'voice_engine',
  'phase',
  'endpoint',
  'provider',
]);

function sanitizeDiagnosticMetadataForAdmin(
  raw: Record<string, unknown> | null,
): Record<string, string | number | boolean> {
  if (!raw) return {};
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (!ADMIN_DIAG_META_KEYS.has(key)) continue;
    if (typeof value === 'boolean') out[key] = value;
    else if (typeof value === 'number' && Number.isFinite(value)) out[key] = value;
    else if (typeof value === 'string') out[key] = value.slice(0, 80);
  }
  return out;
}

function propsMatchInterview(
  props: Record<string, unknown> | null,
  interviewId: string,
): boolean {
  if (!props) return false;
  return props.interview_id === interviewId || props.interviewId === interviewId;
}

const CREDIT_POLICY_CONTEXT =
  'Interview credits are deducted at session start (ledger reason interview_start). ' +
  'interviews.credit_deducted is a denormalized flag — verify against credit_transactions. ' +
  'Restores/service-recovery credits only occur via technical-failure admin RPCs, not this page. ' +
  'This investigation view is read-only and does not adjust credits.';

export async function loadAdminInterviewReview(
  service: SupabaseClient,
  interviewId: string,
): Promise<AdminInterviewReview | null> {
  const { data: interview, error: interviewError } = await service
    .from('interviews')
    .select(
      'id, user_id, role, difficulty, engine, script_type, status, started_at, completed_at, created_at, current_turn_index, credit_deducted, abandoned_resume_used, abandoned_resumed_at, skips_used, max_skips, session_context',
    )
    .eq('id', interviewId)
    .maybeSingle();

  if (interviewError) {
    console.error('[admin:interview-review] interview load failed', {
      interviewId,
      code: interviewError.code,
    });
    throw new Error('Failed to load interview');
  }
  if (!interview) return null;

  const ownerId = asNullableString(interview.user_id) ?? '';

  const [
    ownerRes,
    turnsRes,
    evalsRes,
    reportRes,
    questionsRes,
    creditsRes,
    aiRes,
    voiceRes,
    exitFbRes,
    interviewFbRes,
    techCaseRes,
    diagEventsRes,
  ] = await Promise.all([
    ownerId
      ? service.from('users').select('id, email, name').eq('id', ownerId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    service
      .from('script_turns')
      .select(
        'turn_index, phase, is_question, question_type, llm_output, raw_transcript, answer_text, submitted_as, timer_seconds, created_at',
      )
      .eq('interview_id', interviewId)
      .order('turn_index', { ascending: true }),
    service
      .from('answer_evaluations')
      .select(
        'turn_index, status, overall, question_type, stt_min_confidence, score_suspect, created_at',
      )
      .eq('interview_id', interviewId)
      .order('turn_index', { ascending: true }),
    service
      .from('script_interview_reports')
      .select('id, status, overall, score_band, scored_answer_count, generated_at')
      .eq('interview_id', interviewId)
      .maybeSingle(),
    service
      .from('questions')
      .select('id, order_index, question_text')
      .eq('interview_id', interviewId)
      .order('order_index', { ascending: true }),
    service
      .from('credit_transactions')
      .select('id, type, amount, reason, created_at')
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true }),
    service
      .from('ai_call_logs')
      .select(
        'id, operation, provider, model, success, error_category, error_code, retries, latency_ms, session_id, user_agent, created_at',
      )
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true })
      .limit(100),
    service
      .from('voice_usage_logs')
      .select(
        'id, provider, voice_type, success, error_category, latency_ms, session_id, created_at',
      )
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: true })
      .limit(100),
    service
      .from('interview_exit_feedbacks')
      .select(
        'id, created_at, exit_reason, issue_type, is_resolved, is_archived, is_read, notes, device_info, progress_percent, question_index',
      )
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false }),
    service
      .from('interview_feedbacks')
      .select(
        'id, created_at, issue_type, is_resolved, is_archived, is_read, notes, device_info',
      )
      .eq('interview_id', interviewId)
      .order('created_at', { ascending: false }),
    service
      .from('technical_failure_cases')
      .select(
        'id, feedback_id, failure_category, status, submitted_at, resolved_at, reviewed_by_email, decision_reason, original_debit_transaction_id, restoration_transaction_id',
      )
      .eq('interview_id', interviewId)
      .order('submitted_at', { ascending: false })
      .limit(1),
    service
      .from('interview_diagnostic_events')
      .select(
        'id, event_type, occurred_at, recorded_at, source, severity, error_code, correlation_id, turn_index, confirmation, metadata',
      )
      .eq('interview_id', interviewId)
      .order('occurred_at', { ascending: true })
      .limit(100),
  ]);

  if (turnsRes.error) {
    console.error('[admin:interview-review] turns load failed', {
      interviewId,
      code: turnsRes.error.code,
    });
    throw new Error('Failed to load interview turns');
  }

  for (const [label, res] of [
    ['owner', ownerRes],
    ['evaluations', evalsRes],
    ['report', reportRes],
    ['questions', questionsRes],
    ['credits', creditsRes],
    ['ai_call_logs', aiRes],
    ['voice_usage_logs', voiceRes],
    ['exit_feedback', exitFbRes],
    ['interview_feedback', interviewFbRes],
    ['technical_failure_cases', techCaseRes],
    ['interview_diagnostic_events', diagEventsRes],
  ] as const) {
    if (res.error) {
      // Missing table (migration not applied) is expected in some envs — soft-warn.
      console.warn(`[admin:interview-review] ${label} load failed`, {
        interviewId,
        code: res.error.code,
      });
    }
  }

  // product_events: filter by user then match interview_id in props (no jsonb filter required).
  let productRows: Record<string, unknown>[] = [];
  if (ownerId) {
    const peRes = await service
      .from('product_events')
      .select('id, event_name, props, created_at')
      .eq('user_id', ownerId)
      .order('created_at', { ascending: true })
      .limit(300);
    if (peRes.error) {
      console.warn('[admin:interview-review] product_events load failed', {
        interviewId,
        code: peRes.error.code,
      });
    } else {
      productRows = (peRes.data ?? []).filter((row) =>
        propsMatchInterview(asRecord(row.props), interviewId),
      );
    }
  }

  const questionIds = (questionsRes.data ?? [])
    .map((q) => asNullableString(q.id))
    .filter((id): id is string => Boolean(id));

  const answersRes =
    questionIds.length > 0
      ? await service
          .from('answers')
          .select('question_id, answer_text, submitted_at')
          .in('question_id', questionIds)
          .order('submitted_at', { ascending: true })
      : { data: [] as Record<string, unknown>[], error: null };

  if (answersRes.error) {
    console.warn('[admin:interview-review] answers load failed', {
      interviewId,
      code: answersRes.error.code,
    });
  }

  const techCaseRow = (techCaseRes.data ?? [])[0] ?? null;
  let platformFeedback: Record<string, unknown> | null = null;
  if (techCaseRow) {
    const fbId = asNullableString(techCaseRow.feedback_id);
    if (fbId) {
      const pfRes = await service
        .from('feedbacks')
        .select(
          'id, created_at, severity, is_resolved, is_archived, is_read, notes, screenshot_url, browser_info, session_context',
        )
        .eq('id', fbId)
        .maybeSingle();
      if (pfRes.error) {
        console.warn('[admin:interview-review] platform feedback load failed', {
          interviewId,
          code: pfRes.error.code,
        });
      } else {
        platformFeedback = pfRes.data;
      }
    }
  }

  const evalByTurn = new Map<
    number,
    {
      status: string | null;
      overall: number | null;
      question_type: string | null;
      stt_min_confidence: number | null;
      score_suspect: boolean | null;
      created_at: string | null;
    }
  >();
  for (const row of evalsRes.data ?? []) {
    const idx = asNullableNumber(row.turn_index);
    if (idx == null) continue;
    evalByTurn.set(idx, {
      status: asNullableString(row.status),
      overall: asNullableNumber(row.overall),
      question_type: asNullableString(row.question_type),
      stt_min_confidence: asNullableNumber(row.stt_min_confidence),
      score_suspect: asNullableBoolean(row.score_suspect),
      created_at: asNullableString(row.created_at),
    });
  }

  const turns: AdminInterviewTurnView[] = (turnsRes.data ?? []).map((row) => {
    const turnIndex = asNullableNumber(row.turn_index) ?? 0;
    const answerText = extractTurnAnswerText(row.answer_text, row.raw_transcript);
    return {
      turn_index: turnIndex,
      phase: asNullableString(row.phase),
      is_question: Boolean(row.is_question),
      question_type: asNullableString(row.question_type),
      question_text: extractTurnQuestionText(row.llm_output),
      answer_text: answerText,
      raw_transcript: asNullableString(row.raw_transcript),
      submitted_as: asNullableString(row.submitted_as),
      timer_seconds: asNullableNumber(row.timer_seconds),
      created_at: asNullableString(row.created_at),
      delivery_state: 'persisted',
      answer_state: answerText ? 'captured' : 'missing',
      evaluation: evalByTurn.get(turnIndex) ?? null,
    };
  });

  const answersByQuestion = new Map<
    string,
    { answer_text: string | null; submitted_at: string | null }
  >();
  for (const row of answersRes.data ?? []) {
    const qid = asNullableString(row.question_id);
    if (!qid) continue;
    answersByQuestion.set(qid, {
      answer_text: asNullableString(row.answer_text),
      submitted_at: asNullableString(row.submitted_at),
    });
  }

  const legacy_qa: AdminLegacyQaView[] = (questionsRes.data ?? []).map((q) => {
    const qid = asNullableString(q.id) ?? '';
    const ans = answersByQuestion.get(qid);
    return {
      order_index: asNullableNumber(q.order_index) ?? 0,
      question_text: asNullableString(q.question_text) ?? '',
      answer_text: ans?.answer_text ?? null,
      answered_at: ans?.submitted_at ?? null,
    };
  });

  const reportRow = reportRes.data;
  const report: AdminScriptReportSummary | null = reportRow
    ? {
        id: asNullableString(reportRow.id) ?? '',
        status: asNullableString(reportRow.status),
        overall: asNullableNumber(reportRow.overall),
        score_band: asNullableString(reportRow.score_band),
        scored_answer_count: asNullableNumber(reportRow.scored_answer_count),
        generated_at: asNullableString(reportRow.generated_at),
      }
    : null;

  const credit_transactions: AdminCreditTransactionView[] = (creditsRes.data ?? []).map(
    (row) => ({
      id: asNullableString(row.id) ?? '',
      type: asNullableString(row.type) ?? 'unknown',
      amount: asNullableNumber(row.amount) ?? 0,
      reason: asNullableString(row.reason),
      created_at: asNullableString(row.created_at),
    }),
  );

  const product_events: AdminProductEventView[] = productRows.map((row) => ({
    id: asNullableString(row.id) ?? '',
    event_name: asNullableString(row.event_name) ?? 'unknown',
    created_at: asNullableString(row.created_at),
    props: asRecord(row.props) ?? {},
  }));

  const ai_call_logs: AdminAiCallLogView[] = (aiRes.data ?? []).map((row) => ({
    id: asNullableString(row.id) ?? '',
    operation: asNullableString(row.operation) ?? 'unknown',
    provider: asNullableString(row.provider) ?? 'unknown',
    model: asNullableString(row.model) ?? 'unknown',
    success: Boolean(row.success),
    error_category: asNullableString(row.error_category),
    error_code: asNullableString(row.error_code),
    retries: asNullableNumber(row.retries),
    latency_ms: asNullableNumber(row.latency_ms),
    session_id: asNullableString(row.session_id),
    user_agent: asNullableString(row.user_agent),
    created_at: asNullableString(row.created_at),
  }));

  const voice_logs: AdminVoiceLogView[] = (voiceRes.data ?? []).map((row) => ({
    id: asNullableString(row.id) ?? '',
    provider: asNullableString(row.provider) ?? 'unknown',
    voice_type: asNullableString(row.voice_type) ?? 'unknown',
    success: Boolean(row.success),
    error_category: asNullableString(row.error_category),
    latency_ms: asNullableNumber(row.latency_ms),
    session_id: asNullableString(row.session_id),
    created_at: asNullableString(row.created_at),
  }));

  const linked_feedback: AdminFeedbackLinkView[] = [];

  for (const row of exitFbRes.data ?? []) {
    linked_feedback.push({
      id: asNullableString(row.id) ?? '',
      source: 'exit',
      created_at: asNullableString(row.created_at),
      severity: null,
      exit_reason: asNullableString(row.exit_reason),
      issue_type: asNullableString(row.issue_type),
      is_resolved: Boolean(row.is_resolved),
      is_archived: Boolean(row.is_archived),
      is_read: Boolean(row.is_read),
      notes: asNullableString(row.notes),
      screenshot_url: null,
      device_info: asRecord(row.device_info),
      progress_percent: asNullableNumber(row.progress_percent),
      question_index: asNullableNumber(row.question_index),
    });
  }

  for (const row of interviewFbRes.data ?? []) {
    linked_feedback.push({
      id: asNullableString(row.id) ?? '',
      source: 'interview',
      created_at: asNullableString(row.created_at),
      severity: null,
      exit_reason: null,
      issue_type: asNullableString(row.issue_type),
      is_resolved: Boolean(row.is_resolved),
      is_archived: Boolean(row.is_archived),
      is_read: Boolean(row.is_read),
      notes: asNullableString(row.notes),
      screenshot_url: null,
      device_info: asRecord(row.device_info),
      progress_percent: null,
      question_index: null,
    });
  }

  if (platformFeedback) {
    linked_feedback.push({
      id: asNullableString(platformFeedback.id) ?? '',
      source: 'platform',
      created_at: asNullableString(platformFeedback.created_at),
      severity: asNullableString(platformFeedback.severity),
      exit_reason: null,
      issue_type: null,
      is_resolved: Boolean(platformFeedback.is_resolved),
      is_archived: Boolean(platformFeedback.is_archived),
      is_read: Boolean(platformFeedback.is_read),
      notes: asNullableString(platformFeedback.notes),
      screenshot_url: asNullableString(platformFeedback.screenshot_url),
      device_info: asRecord(platformFeedback.session_context),
      progress_percent: null,
      question_index: null,
    });
  }

  const technical_failure_case: AdminTechnicalFailureView | null = techCaseRow
    ? {
        id: asNullableString(techCaseRow.id) ?? '',
        feedback_id: asNullableString(techCaseRow.feedback_id) ?? '',
        failure_category: asNullableString(techCaseRow.failure_category) ?? 'other',
        status: asNullableString(techCaseRow.status) ?? 'submitted',
        submitted_at: asNullableString(techCaseRow.submitted_at),
        resolved_at: asNullableString(techCaseRow.resolved_at),
        reviewed_by_email: asNullableString(techCaseRow.reviewed_by_email),
        decision_reason: asNullableString(techCaseRow.decision_reason),
        original_debit_transaction_id: asNullableString(
          techCaseRow.original_debit_transaction_id,
        ),
        restoration_transaction_id: asNullableString(techCaseRow.restoration_transaction_id),
      }
    : null;

  const visual_evidence: AdminVisualEvidenceView[] = [];
  for (const fb of linked_feedback) {
    if (fb.screenshot_url) {
      visual_evidence.push({
        id: `shot-${fb.id}`,
        type: 'screenshot',
        capture_timestamp: fb.created_at,
        source: `${fb.source} feedback`,
        availability: 'available',
        retention_note: 'Signed URL from feedback-screenshots bucket (platform feedback only).',
        url: fb.screenshot_url,
      });
    }
  }
  // Honest empty-adjacent marker for replay — never claim Clarity as in-product artifact.
  if (visual_evidence.length === 0) {
    visual_evidence.push({
      id: 'replay-unavailable',
      type: 'replay',
      capture_timestamp: null,
      source: 'in-product session replay',
      availability: 'unavailable',
      retention_note:
        'No in-product session recording. Microsoft Clarity (if enabled) is external and not joinable by interview id.',
      url: null,
    });
  }

  const diagnostics: AdminDiagnosticErrorView[] = [];
  for (const log of ai_call_logs) {
    if (log.success) continue;
    diagnostics.push({
      id: log.id,
      category: 'ai',
      error_code: log.error_code,
      message: log.error_category ?? 'AI call failed',
      timestamp: log.created_at,
      source: `${log.provider}/${log.operation}`,
      http_status: null,
      correlation_id: log.session_id,
      retry_count: log.retries,
      browser_context: log.user_agent,
    });
  }
  for (const log of voice_logs) {
    if (log.success) continue;
    diagnostics.push({
      id: log.id,
      category: 'voice',
      error_code: log.error_category,
      message: `${log.voice_type} failure`,
      timestamp: log.created_at,
      source: `${log.provider}/${log.voice_type}`,
      http_status: null,
      correlation_id: log.session_id,
      retry_count: null,
      browser_context: null,
    });
  }

  const diagnostic_events: AdminDiagnosticEventView[] = (diagEventsRes.data ?? []).map((row) => {
    const severityRaw = asNullableString(row.severity);
    const severity: AdminDiagnosticEventView['severity'] =
      severityRaw === 'error' || severityRaw === 'warning' || severityRaw === 'info'
        ? severityRaw
        : 'info';
    const confirmationRaw = asNullableString(row.confirmation);
    return {
      id: asNullableString(row.id) ?? '',
      event_type: asNullableString(row.event_type) ?? 'unknown',
      occurred_at: asNullableString(row.occurred_at),
      recorded_at: asNullableString(row.recorded_at),
      source: asNullableString(row.source) ?? 'client',
      severity,
      error_code: asNullableString(row.error_code),
      correlation_id: asNullableString(row.correlation_id),
      turn_index: asNullableNumber(row.turn_index),
      confirmation:
        confirmationRaw === 'server_confirmed' ? 'server_confirmed' : 'client_reported',
      // Defense-in-depth: only allowlisted scalar keys reach the admin UI.
      metadata: sanitizeDiagnosticMetadataForAdmin(asRecord(row.metadata)),
    };
  });

  const answered_turn_count = turns.filter((t) => t.answer_state === 'captured').length;
  const startedMs = interview.started_at ? Date.parse(String(interview.started_at)) : NaN;
  const endedMs = interview.completed_at ? Date.parse(String(interview.completed_at)) : NaN;
  const duration_ms =
    Number.isFinite(startedMs) && Number.isFinite(endedMs) && endedMs >= startedMs
      ? endedMs - startedMs
      : null;

  const ownerRow = ownerRes.data;
  const owner: AdminInterviewOwner | null = ownerRow
    ? {
        id: asNullableString(ownerRow.id) ?? ownerId,
        email: asNullableString(ownerRow.email),
        name: asNullableString(ownerRow.name),
      }
    : ownerId
      ? { id: ownerId, email: null, name: null }
      : null;

  return {
    interview: {
      id: asNullableString(interview.id) ?? interviewId,
      user_id: ownerId,
      role: asNullableString(interview.role),
      difficulty: asNullableString(interview.difficulty),
      engine: asNullableString(interview.engine),
      script_type: asNullableString(interview.script_type),
      status: asNullableString(interview.status),
      started_at: asNullableString(interview.started_at),
      completed_at: asNullableString(interview.completed_at),
      created_at: asNullableString(interview.created_at),
      current_turn_index: asNullableNumber(interview.current_turn_index),
      credit_deducted: asNullableBoolean(interview.credit_deducted),
      abandoned_resume_used: asNullableBoolean(interview.abandoned_resume_used),
      abandoned_resumed_at: asNullableString(interview.abandoned_resumed_at),
      skips_used: asNullableNumber(interview.skips_used),
      max_skips: asNullableNumber(interview.max_skips),
      session_context: asRecord(interview.session_context),
    },
    owner,
    turns,
    legacy_qa,
    report,
    credit_transactions,
    product_events,
    ai_call_logs,
    voice_logs,
    linked_feedback,
    technical_failure_case,
    visual_evidence,
    diagnostics,
    diagnostic_events,
    credit_policy_context: CREDIT_POLICY_CONTEXT,
    progress: {
      turn_count: turns.length,
      answered_turn_count,
      evaluation_count: evalByTurn.size,
      has_report: Boolean(report),
      duration_ms,
    },
  };
}
