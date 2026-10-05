import { describe, expect, it } from 'vitest';
import type { ScriptTurnOutput } from '@/lib/ai/scripts/turn-validator';
import { bindPlannedCoreQuestion } from './bind-turn';
import { classifyCoreDuplicate } from './duplicate';
import { emergencyCoreQuestion, nextFallbackQuestion } from './fallback';
import { isIncompleteUnaskedPlan } from './persist';
import { excludeRejectedQuestions } from './generate-pool';
import { scoreQuestionNovelty } from './novelty';
import { assembleQuestionPlan, slotTypeForIndex } from './select';
import type { PlannedCoreQuestion, PoolQuestion } from './types';

const STACK = 'What is the difference between stack memory and heap memory?';
const STACK_PARAPHRASE = 'Can you explain the difference between stack and heap memory?';
const INDEX = 'How does a database index work?';
const INDEX_PARAPHRASE = 'Explain how database indexes improve query performance.';
const INDEX_FOLLOW_UP = 'When would adding an index hurt write performance?';
const PROJECT_ATLAS =
  'In Project Atlas, what trade-off did you make around PostgreSQL, and what would you change if you rebuilt that part?';
const PROJECT_BOREALIS =
  'In Project Borealis, what trade-off did you make around Java, and what would you change if you rebuilt that part?';

function poolQuestion(text: string, type: 'technical' | 'behavioral', grounding: PoolQuestion['groundingKind'] = 'project'): PoolQuestion {
  return {
    questionText: text,
    category: type === 'technical' ? 'technical' : 'behavioral',
    questionType: type,
    groundingKind: grounding,
    personalizationReason: grounding,
    source: 'llm_plan',
  };
}

function planned(partial: Partial<PlannedCoreQuestion> & Pick<PlannedCoreQuestion, 'questionText' | 'questionType' | 'orderIndex'>): PlannedCoreQuestion {
  return {
    id: partial.id ?? `q-${partial.orderIndex}`,
    category: partial.questionType === 'technical' ? 'technical' : 'behavioral',
    difficulty: 'medium',
    source: 'llm_plan',
    planStatus: 'planned',
    grounding: {
      resume: true,
      project: true,
      jd: false,
      role: true,
      personalizationReason: 'project',
      noveltyScore: 0.5,
    },
    rubric: {
      ideal_keywords: ['specific'],
      ideal_structure: 'Context, action, outcome.',
      red_flags: ['vague'],
    },
    ...partial,
  };
}

function coreTurn(display: string, over: Partial<ScriptTurnOutput> = {}): ScriptTurnOutput {
  return {
    speech: display,
    display_question: display,
    tip: null,
    timer_seconds: 120,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    phase: 'core',
    is_question: true,
    is_follow_up: false,
    question_type: 'technical',
    question_difficulty: 'medium',
    interviewer_emotion: 'neutral',
    ...over,
  };
}

describe('core question duplicate detection', () => {
  it('rejects a same-topic paraphrase inside one interview', () => {
    const match = classifyCoreDuplicate(STACK, STACK_PARAPHRASE);
    expect(match.duplicate).toBe(true);
    expect(match.kind === 'exact' || match.kind === 'same_topic' || match.kind === 'lexical').toBe(true);
  });

  it('treats case and punctuation as the same question', () => {
    const match = classifyCoreDuplicate('How does a database index work?', 'how does a database index work');
    expect(match.duplicate).toBe(true);
    expect(match.kind).toBe('exact');
  });

  it('strips a leading interviewer bridge before comparing', () => {
    const match = classifyCoreDuplicate("Let's go deeper. How does a database index work?", INDEX);
    expect(match.duplicate).toBe(true);
    expect(match.kind).toBe('exact');
  });

  it('does not treat a write-performance probe as the same core question', () => {
    const match = classifyCoreDuplicate(INDEX, INDEX_FOLLOW_UP);
    expect(match.duplicate).toBe(false);
  });

  it('treats an index-mechanism paraphrase as the same core topic', () => {
    const match = classifyCoreDuplicate(INDEX, INDEX_PARAPHRASE);
    expect(match.duplicate).toBe(true);
    expect(match.kind).toBe('same_topic');
  });

  it('treats different wording of the same index concept as one core', () => {
    const match = classifyCoreDuplicate(
      'How does a database index work internally?',
      'Why do indexes speed up database queries?',
    );
    expect(match.duplicate).toBe(true);
  });

  it('treats authentication and session protection as the same competency', () => {
    const match = classifyCoreDuplicate(
      'How would you secure authentication in a web application?',
      'How would you protect user sessions after login?',
    );
    expect(match.duplicate).toBe(true);
    expect(match.kind).toBe('same_topic');
  });

  it('keeps a write-performance follow-up distinct from the indexing core', () => {
    const match = classifyCoreDuplicate(
      'How does database indexing work?',
      'What happens to write performance when the table has many indexes?',
    );
    expect(match.duplicate).toBe(false);
  });
});

describe('question plan selection', () => {
  it('prefers a candidate-specific question over a recently repeated generic one', () => {
    const recent = Array.from({ length: 6 }, () => STACK);
    const generic = scoreQuestionNovelty({
      questionText: STACK,
      context: { role: 'Full Stack Developer', skills: ['React'], projects: ['Project Atlas'], jobDescription: 'PostgreSQL' },
      recentQuestions: recent,
      userHistory: [],
    });
    const specific = scoreQuestionNovelty({
      questionText: PROJECT_ATLAS,
      context: { role: 'Full Stack Developer', skills: ['React'], projects: ['Project Atlas'], jobDescription: 'PostgreSQL' },
      recentQuestions: recent,
      userHistory: [],
    });
    expect(specific.score).toBeGreaterThan(generic.score);

    const plan = assembleQuestionPlan({
      candidates: [poolQuestion(STACK, 'technical', 'general'), poolQuestion(PROJECT_ATLAS, 'technical', 'project')],
      required: 1,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: { role: 'Full Stack Developer', skills: ['React', 'PostgreSQL'], projects: ['Project Atlas'] },
      recentQuestions: recent,
    });
    expect(plan.questions[0]?.questionText).toBe(PROJECT_ATLAS);
    expect(plan.events.some((event) => event.event === 'question_rejected_low_novelty')).toBe(true);
  });

  it('keeps SCRIPT_M alternation on the persisted plan', () => {
    const candidates = [
      poolQuestion('How does React reconcile the Atlas dashboard tree?', 'technical'),
      poolQuestion('Explain PostgreSQL locking in Project Atlas.', 'technical'),
      poolQuestion('Tell me about a decision you owned on Project Atlas. What was at stake, what did you do, and what was the result?', 'behavioral'),
      poolQuestion('Describe a disagreement about how to build Project Atlas. What did you specifically do, and how did it end?', 'behavioral'),
    ];
    const plan = assembleQuestionPlan({
      candidates,
      required: 4,
      scriptType: 'SCRIPT_M',
      difficulty: 'medium',
      interviewMode: 'mixed',
      context: { role: 'Full Stack Developer', skills: ['React'], projects: ['Project Atlas'] },
    });
    expect(plan.questions.map((question) => question.questionType)).toEqual([
      'technical',
      'behavioral',
      'technical',
      'behavioral',
    ]);
    expect(slotTypeForIndex('SCRIPT_M', 0)).toBe('technical');
    expect(slotTypeForIndex('SCRIPT_M', 1)).toBe('behavioral');
  });

  it('builds different plans for materially different resumes', () => {
    const atlas = assembleQuestionPlan({
      candidates: [],
      required: 2,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: { role: 'Full Stack Developer', skills: ['React', 'PostgreSQL'], projects: ['Project Atlas'] },
    });
    const borealis = assembleQuestionPlan({
      candidates: [],
      required: 2,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: { role: 'Full Stack Developer', skills: ['Java'], projects: ['Project Borealis'] },
    });
    expect(atlas.questions[0]?.questionText).toContain('Project Atlas');
    expect(borealis.questions[0]?.questionText).toContain('Project Borealis');
    expect(atlas.questions[0]?.questionText).not.toBe(borealis.questions[0]?.questionText);
  });

  it('changes the plan when the job description changes', () => {
    const kafka = assembleQuestionPlan({
      candidates: [],
      required: 4,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: {
        role: 'Backend Engineer',
        skills: ['Java'],
        projects: ['Billing Service'],
        jobDescription: 'Own Kafka consumers and event-driven billing.',
      },
    });
    const kube = assembleQuestionPlan({
      candidates: [],
      required: 4,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: {
        role: 'Backend Engineer',
        skills: ['Java'],
        projects: ['Billing Service'],
        jobDescription: 'Own Kubernetes rollouts and on-call for the billing platform.',
      },
    });
    const kafkaText = kafka.questions.map((question) => question.questionText).join(' ');
    const kubeText = kube.questions.map((question) => question.questionText).join(' ');
    expect(kafkaText).toContain('Kafka');
    expect(kubeText).toContain('Kubernetes');
    expect(kafkaText).not.toBe(kubeText);
  });

  it('does not reintroduce a rejected question on retry', () => {
    const rejected = excludeRejectedQuestions(
      [
        poolQuestion(STACK, 'technical', 'general'),
        poolQuestion(STACK_PARAPHRASE, 'technical', 'general'),
        poolQuestion(PROJECT_ATLAS, 'technical'),
      ],
      [STACK],
    );
    expect(rejected.map((question) => question.questionText)).toEqual([PROJECT_ATLAS]);

    const plan = assembleQuestionPlan({
      candidates: [
        poolQuestion(STACK, 'technical', 'general'),
        poolQuestion(STACK_PARAPHRASE, 'technical', 'general'),
        poolQuestion(PROJECT_ATLAS, 'technical'),
      ],
      required: 1,
      scriptType: 'SCRIPT_T',
      difficulty: 'medium',
      interviewMode: 'technical',
      context: { role: 'Full Stack Developer', skills: ['PostgreSQL'], projects: ['Project Atlas'] },
      rejected: [STACK],
    });
    expect(plan.questions[0]?.questionText).toBe(PROJECT_ATLAS);
  });

  it('keeps fallback questions off already asked text', () => {
    const context = { role: 'Full Stack Developer', skills: ['React'], projects: ['Project Atlas'] };
    const first = nextFallbackQuestion({ context, questionType: 'technical', slot: 0, blocked: [] });
    expect(first).not.toBeNull();
    const second = nextFallbackQuestion({
      context,
      questionType: 'technical',
      slot: 1,
      blocked: [first!.text],
    });
    expect(second).not.toBeNull();
    expect(classifyCoreDuplicate(first!.text, second!.text).duplicate).toBe(false);
    expect(first!.text.toLowerCase()).not.toContain('stack memory');
  });
});

describe('bindPlannedCoreQuestion', () => {
  const context = { role: 'Full Stack Developer', skills: ['PostgreSQL'], projects: ['Project Atlas'] };

  it('replaces a duplicate core with the next planned question', () => {
    const result = bindPlannedCoreQuestion({
      turn: coreTurn(STACK_PARAPHRASE),
      scriptType: 'SCRIPT_T',
      plan: [
        planned({ orderIndex: 0, questionText: STACK, questionType: 'technical', planStatus: 'asked' }),
        planned({ id: 'next', orderIndex: 1, questionText: PROJECT_ATLAS, questionType: 'technical' }),
      ],
      alreadyAskedCore: [STACK],
      context,
    });
    expect(result.turn.display_question).toBe(PROJECT_ATLAS);
    expect(result.askedId).toBe('next');
    expect(result.turn.is_follow_up).toBe(false);
    expect(
      result.events.some(
        (event) =>
          event.event === 'question_rejected_duplicate',
      ),
    ).toBe(true);
  });

  it('keeps a legitimate follow-up and does not consume the plan', () => {
    const result = bindPlannedCoreQuestion({
      turn: coreTurn(INDEX_FOLLOW_UP, { is_follow_up: true, speech: `Before we move on. ${INDEX_FOLLOW_UP}` }),
      scriptType: 'SCRIPT_T',
      plan: [planned({ orderIndex: 1, questionText: PROJECT_BOREALIS, questionType: 'technical' })],
      alreadyAskedCore: [INDEX],
      context,
    });
    expect(result.turn.display_question).toBe(INDEX_FOLLOW_UP);
    expect(result.turn.is_follow_up).toBe(true);
    expect(result.askedId).toBeNull();
  });

  it('serves technical then behavioral from the plan for SCRIPT_M', () => {
    const technical = planned({
      id: 't1',
      orderIndex: 0,
      questionText: PROJECT_ATLAS,
      questionType: 'technical',
    });
    const behavioral = planned({
      id: 'b1',
      orderIndex: 1,
      questionText: 'Tell me about a decision you owned on Project Atlas. What was at stake, what did you do, and what was the result?',
      questionType: 'behavioral',
    });
    const first = bindPlannedCoreQuestion({
      turn: coreTurn('Tell me about stack memory and heap memory.'),
      scriptType: 'SCRIPT_M',
      lastQuestionType: null,
      plan: [technical, behavioral],
      alreadyAskedCore: [],
      context,
    });
    const second = bindPlannedCoreQuestion({
      turn: coreTurn('Tell me about teamwork.', { question_type: 'behavioral' }),
      scriptType: 'SCRIPT_M',
      lastQuestionType: 'technical',
      plan: [{ ...technical, planStatus: 'asked' }, behavioral],
      alreadyAskedCore: [PROJECT_ATLAS],
      context,
    });
    expect(first.turn.question_type).toBe('technical');
    expect(first.turn.display_question).toBe(PROJECT_ATLAS);
    expect(second.turn.question_type).toBe('behavioral');
    expect(second.turn.display_question).toContain('Project Atlas');
  });

  it('does not persist an already-asked core when the plan and fallbacks are exhausted', () => {
    const blocked: string[] = [];
    for (let slot = 0; slot < 12; slot += 1) {
      const next = nextFallbackQuestion({
        context,
        questionType: 'technical',
        slot,
        blocked,
      });
      if (!next) break;
      blocked.push(next.text);
    }
    for (let slot = 0; slot < 8; slot += 1) {
      const next = emergencyCoreQuestion({
        role: context.role,
        questionType: 'technical',
        blocked,
      });
      if (!next) break;
      blocked.push(next);
    }
    const result = bindPlannedCoreQuestion({
      turn: coreTurn(blocked[0] ?? STACK),
      scriptType: 'SCRIPT_T',
      plan: [],
      alreadyAskedCore: blocked,
      context,
    });
    expect(result.turn.is_question).toBe(false);
    expect(result.turn.display_question).toBeNull();
    expect(result.events.some((event) => event.event === 'question_plan_fallback')).toBe(true);
  });
});

describe('plan shape and failure contracts', () => {
  const base = {
    scriptType: 'SCRIPT_T' as const,
    difficulty: 'medium' as const,
    interviewMode: 'technical',
    context: { role: 'Backend Engineer', skills: ['Go'], projects: ['Ledger'] },
  };

  it('creates 4, 6, and 8 cores for easy, medium, and hard', () => {
    const texts = [
      'How did Ledger expire cache entries?',
      'How did Ledger partition kafka messages?',
      'How did Ledger rotate signing keys?',
      'How did Ledger throttle public requests?',
      'How did Ledger replay failed webhooks?',
      'How did Ledger snapshot billing rows?',
      'How did Ledger isolate tenant data?',
      'How did Ledger trace request latency?',
    ];
    for (const [difficulty, count] of [
      ['easy', 4],
      ['medium', 6],
      ['hard', 8],
    ] as const) {
      const plan = assembleQuestionPlan({
        ...base,
        candidates: texts.map((text) => poolQuestion(text, 'technical', 'project')),
        required: count,
        difficulty,
      });
      expect(plan.questions).toHaveLength(count);
      expect(plan.events[0]?.event).toBe('question_plan_generated');
      const normalized = plan.questions.map((question) => question.questionText);
      expect(new Set(normalized).size).toBe(count);
    }
  });

  it('keeps technical and behavioral modes on one progression', () => {
    const technical = assembleQuestionPlan({ ...base, candidates: [], required: 4, scriptType: 'SCRIPT_T' });
    const behavioral = assembleQuestionPlan({
      ...base,
      candidates: [],
      required: 4,
      scriptType: 'SCRIPT_H',
      interviewMode: 'hr_behavioral',
    });
    expect(technical.questions.every((question) => question.questionType === 'technical')).toBe(true);
    expect(behavioral.questions.every((question) => question.questionType === 'behavioral')).toBe(true);
  });

  it('does not put a rejected candidate back into the plan', () => {
    const first = assembleQuestionPlan({ ...base, candidates: [], required: 1 });
    const asked = first.questions[0]?.questionText ?? '';
    const second = assembleQuestionPlan({
      ...base,
      candidates: [poolQuestion(asked, 'technical', 'general')],
      required: 1,
      rejected: [asked],
    });
    expect(classifyCoreDuplicate(asked, second.questions[0]?.questionText ?? '').duplicate).toBe(false);
    expect(second.events.some((event) => event.event === 'question_rejected_duplicate')).toBe(true);
  });

  it('lets a planned-but-unasked reservation lower novelty without banning the topic', () => {
    const context = { role: 'Backend Engineer', skills: ['Go'], projects: ['Ledger'] };
    const open = scoreQuestionNovelty({
      questionText: 'How would you design a rate limiter for a public API?',
      context,
      recentQuestions: [],
      userHistory: [],
      reservedQuestions: [],
    });
    const reserved = scoreQuestionNovelty({
      questionText: 'How would you design a rate limiter for a public API?',
      context,
      recentQuestions: [],
      userHistory: [],
      reservedQuestions: ['How would you design a rate limiter for a public API?'],
    });
    expect(open.score).toBeGreaterThan(reserved.score);
    expect(reserved.score).toBeGreaterThan(-1);
  });

  it('uses the candidate profile to break equal novelty ties', () => {
    const left = 'How would you design a cache invalidation strategy for a read-heavy API?';
    const right = 'How would you design a rate limiter for a public API?';
    const pick = (role: string) =>
      assembleQuestionPlan({
        candidates: [poolQuestion(left, 'technical', 'general'), poolQuestion(right, 'technical', 'general')],
        required: 1,
        scriptType: 'SCRIPT_T',
        difficulty: 'medium',
        interviewMode: 'technical',
        context: { role, skills: [], projects: [] },
      }).questions[0]?.questionText;
    expect(pick('Backend Engineer')).toBe(pick('Backend Engineer'));
    const picks = ['Data Engineer', 'Mobile Engineer', 'Security Engineer', 'Frontend Engineer'].map(pick);
    expect(picks.some((text) => text !== pick('Backend Engineer'))).toBe(true);
  });

  it('lowers novelty when the same candidate already heard the question', () => {
    const context = { role: 'Backend Engineer', skills: ['Go'], projects: ['Ledger'] };
    const fresh = scoreQuestionNovelty({
      questionText: STACK,
      context,
      recentQuestions: [],
      userHistory: [],
    });
    const repeat = scoreQuestionNovelty({
      questionText: STACK,
      context,
      recentQuestions: [],
      userHistory: [STACK, STACK],
    });
    expect(fresh.score).toBeGreaterThan(repeat.score);
  });

  it('treats a short all-planned set as incomplete and a finished set as complete', () => {
    const rows = [
      planned({ orderIndex: 0, questionText: PROJECT_ATLAS, questionType: 'technical' }),
      planned({ orderIndex: 1, questionText: PROJECT_BOREALIS, questionType: 'technical' }),
    ];
    expect(isIncompleteUnaskedPlan(rows, 4)).toBe(true);
    expect(isIncompleteUnaskedPlan(rows, 2)).toBe(false);
    expect(isIncompleteUnaskedPlan([{ ...rows[0]!, planStatus: 'asked' }], 4)).toBe(false);
  });
});
