import { describe, expect, it } from 'vitest';
import { hasTechnicalContent, isUnsuitableHrQuestion } from './hr-question-guard';
import { assembleQuestionPlan } from './select';
import { canonicalizeQuestionSpeech } from '@/lib/ai/scripts/speech-display-question';
import type { PoolQuestion } from './types';

const PRODUCTION_BAD = [
  "Your project, 'Task Offloading in Safety Critical Systems,' likely involved careful consideration of resource allocation. Imagine you've identified a critical bug in the offloading mechanism just before a major demonstration. Describe your immediate steps.",
  "Your skills include Linux and Bash. Consider a scenario where you're deploying a full-stack application to a Linux server and you encounter unexpected performance degradation. What steps would you take?",
  'Given your experience with C++ and Python, imagine you\'re tasked with integrating a new AI model into an existing C++ codebase. What are the key challenges you anticipate?',
  "For your 'ATS Resume Checker' project, you likely had to define how the front-end interacts with the back-end using REST APIs. Describe a challenge you faced in ensuring smooth communication between these components.",
  "You've built projects like an 'ATS Resume Checker'. If you were to start one of these projects again from scratch today, what is one significant change you would make?",
];

const REAL_HR = [
  'Why should we hire you over other candidates?',
  'What is your biggest weakness, and what are you doing about it?',
  'Tell me about a time you disagreed with your manager. How did you handle it?',
  'Tell me about a time you had to meet a tight deadline while the rest of the team was on leave.',
  "On your 'ATS Resume Checker' project, tell me about a disagreement with a teammate. What did you do?",
  'Where do you see yourself in five years?',
  'Are you open to relocation and rotational shifts?',
  'Tell me about a time you failed. What did you learn?',
];

describe('isUnsuitableHrQuestion', () => {
  it.each(PRODUCTION_BAD)('rejects production HR-round question: %s', (text) => {
    expect(isUnsuitableHrQuestion(text)).toBe(true);
  });

  it.each(REAL_HR)('accepts real HR-round question: %s', (text) => {
    expect(isUnsuitableHrQuestion(text)).toBe(false);
  });

  it('flags technical content without hypothetical framing', () => {
    expect(hasTechnicalContent('Describe a challenge with REST APIs between front-end and back-end.')).toBe(true);
  });
});

function pool(text: string): PoolQuestion {
  return {
    questionText: text,
    category: 'behavioral',
    questionType: 'behavioral',
    groundingKind: 'project',
    personalizationReason: 'project',
    source: 'llm_plan',
  };
}

describe('assembleQuestionPlan — HR content filter', () => {
  it('never selects a technical or hypothetical question labelled behavioral', () => {
    const plan = assembleQuestionPlan({
      candidates: [...PRODUCTION_BAD.map(pool), ...REAL_HR.slice(0, 4).map(pool)],
      required: 4,
      scriptType: 'SCRIPT_H',
      difficulty: 'easy',
      interviewMode: 'hr_behavioral',
      context: { role: 'Full Stack Developer', skills: ['Linux', 'Bash'], projects: ['ATS Resume Checker'] },
    });
    expect(plan.questions).toHaveLength(4);
    for (const q of plan.questions) {
      expect(isUnsuitableHrQuestion(q.questionText)).toBe(false);
    }
  });

  it('HR fallback questions never reference technical skills', () => {
    const plan = assembleQuestionPlan({
      candidates: [],
      required: 4,
      scriptType: 'SCRIPT_H',
      difficulty: 'easy',
      interviewMode: 'hr_behavioral',
      context: { role: 'Full Stack Developer', skills: ['Linux', 'Bash', 'C++'], projects: [] },
    });
    for (const q of plan.questions) {
      expect(q.questionText).not.toMatch(/linux|bash|c\+\+/i);
      expect(isUnsuitableHrQuestion(q.questionText)).toBe(false);
    }
  });
});

describe('canonicalizeQuestionSpeech — no repeated sentences', () => {
  it('drops a bridge sentence that the question already starts with', () => {
    const question = 'Your skills include Linux and Bash. Tell me about a time you learned something quickly?';
    const speech = `Let's explore your Linux and Bash skills. Your skills include Linux and Bash. ${question}`;
    const out = canonicalizeQuestionSpeech(speech.replace(question, 'What did you do?'), question);
    expect(out.match(/Your skills include Linux and Bash/g)).toHaveLength(1);
  });

  it('drops a sentence repeated inside the bridge', () => {
    const question = 'Tell me about a time you failed. What did you learn?';
    const out = canonicalizeQuestionSpeech(
      "Understood. You've built two projects. You've built two projects. What changed for you?",
      question,
    );
    expect(out.match(/You've built two projects/g)).toHaveLength(1);
    expect(out.endsWith(question)).toBe(true);
  });
});
