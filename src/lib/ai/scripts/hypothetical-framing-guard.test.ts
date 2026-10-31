import { describe, expect, it, vi } from 'vitest';
import {
  isHypotheticalFraming,
  logIfHypotheticalBehavioralFraming,
  rewriteHypotheticalToRecall,
  rewriteHypotheticalBehavioralTurn,
} from './hypothetical-framing-guard';

describe('isHypotheticalFraming', () => {
  it('flags the actual production failure', () => {
    const text =
      "Let's explore a realistic scenario. Imagine you've just deployed an update to your 'ATS Resume Checker' project, and a critical bug is reported by a user shortly after. Describe your immediate steps to address this situation.";
    expect(isHypotheticalFraming(text)).toBe(true);
  });

  it('flags "imagine you" constructs', () => {
    expect(isHypotheticalFraming('Imagine you just joined a new team with no documentation.')).toBe(
      true,
    );
  });

  it('flags "what would you do if" constructs', () => {
    expect(isHypotheticalFraming('What would you do if a teammate missed every deadline?')).toBe(
      true,
    );
  });

  it('flags "suppose you" constructs', () => {
    expect(isHypotheticalFraming('Suppose you had to onboard a new hire in one day.')).toBe(true);
  });

  it('flags the literal word "hypothetical"', () => {
    expect(isHypotheticalFraming('Just a hypothetical — how would you approach this?')).toBe(true);
  });

  it('does not flag a real-recall behavioral question', () => {
    const text =
      'Tell me about a time a bug reached production on your \'ATS Resume Checker\' project — what happened, and how did you fix it?';
    expect(isHypotheticalFraming(text)).toBe(false);
  });

  it('does not flag a project-grounded conflict question', () => {
    const text =
      'During Campus Placement Portal, when you and a teammate disagreed on approach or scope — what did you do, and what was the outcome?';
    expect(isHypotheticalFraming(text)).toBe(false);
  });

  it('does not flag empty or null-ish text', () => {
    expect(isHypotheticalFraming('')).toBe(false);
  });
});

describe('logIfHypotheticalBehavioralFraming', () => {
  it('logs when a core behavioral question matches hypothetical framing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logIfHypotheticalBehavioralFraming({
      interviewId: 'iv-1',
      turnIndex: 3,
      isBehavioral: true,
      phase: 'core',
      isQuestion: true,
      speech: "Imagine you've just deployed a critical bug.",
      displayQuestion: "Imagine you've just deployed a critical bug.",
    });
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('turn_hypothetical_framing_detected');
    warnSpy.mockRestore();
  });

  it('does not log for a clean real-recall behavioral question', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logIfHypotheticalBehavioralFraming({
      interviewId: 'iv-1',
      turnIndex: 3,
      isBehavioral: true,
      phase: 'core',
      isQuestion: true,
      speech: 'Tell me about a time you missed a deadline.',
      displayQuestion: 'Tell me about a time you missed a deadline.',
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not log for technical questions even with scenario framing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logIfHypotheticalBehavioralFraming({
      interviewId: 'iv-1',
      turnIndex: 3,
      isBehavioral: false,
      phase: 'core',
      isQuestion: true,
      speech: 'Imagine you need to scale this service to 10x traffic.',
      displayQuestion: 'Imagine you need to scale this service to 10x traffic.',
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not log for non-core phases', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logIfHypotheticalBehavioralFraming({
      interviewId: 'iv-1',
      turnIndex: 0,
      isBehavioral: true,
      phase: 'warmup',
      isQuestion: false,
      speech: "Imagine you've just deployed a critical bug.",
      displayQuestion: null,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('does not log when is_question is false', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    logIfHypotheticalBehavioralFraming({
      interviewId: 'iv-1',
      turnIndex: 2,
      isBehavioral: true,
      phase: 'core',
      isQuestion: false,
      speech: "Imagine you've just deployed a critical bug.",
      displayQuestion: null,
    });
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});

describe('rewriteHypotheticalToRecall', () => {
  it('rewrites "Imagine a situation where you" to recall framing', () => {
    const input = 'Imagine a situation where you have implemented a new feature and a bug is found.';
    const result = rewriteHypotheticalToRecall(input);
    expect(result).toMatch(/^Tell me about a time you/);
    expect(isHypotheticalFraming(result)).toBe(false);
  });

  it('rewrites "Imagine you" to recall framing', () => {
    const input = "Imagine you've just deployed an update to your project.";
    const result = rewriteHypotheticalToRecall(input);
    expect(result).toMatch(/Tell me about a time you/);
    expect(isHypotheticalFraming(result)).toBe(false);
  });

  it('rewrites "What would you do if" to recall framing', () => {
    const input = 'What would you do if a teammate missed a deadline?';
    const result = rewriteHypotheticalToRecall(input);
    expect(result).toMatch(/What did you do when/);
    expect(isHypotheticalFraming(result)).toBe(false);
  });

  it('rewrites "Suppose you" to recall framing', () => {
    const input = 'Suppose you had to onboard a new hire in one day.';
    const result = rewriteHypotheticalToRecall(input);
    expect(result).toMatch(/Tell me about a time you/);
    expect(isHypotheticalFraming(result)).toBe(false);
  });

  it('strips "Let\'s explore a scenario" scene-setter', () => {
    const input = "Let's explore a scenario. You've just deployed an update and a bug is reported.";
    const result = rewriteHypotheticalToRecall(input);
    expect(result).not.toMatch(/explore a scenario/i);
  });

  it('returns clean text without double spaces', () => {
    const input = "Imagine you had a conflict with a coworker.";
    const result = rewriteHypotheticalToRecall(input);
    expect(result).not.toMatch(/  /);
  });

  it('returns the original text when no hypothetical framing is present', () => {
    const input = 'Tell me about a time you missed a deadline.';
    expect(rewriteHypotheticalToRecall(input)).toBe(input);
  });

  it('returns empty string unchanged', () => {
    expect(rewriteHypotheticalToRecall('')).toBe('');
  });

  it('rewrites the actual production failure from the screenshot', () => {
    const input =
      "Your project involved 'Task Offloading in Safety Critical Systems.' Imagine a situation where you've implemented a new offloading mechanism, and during testing, you discover a subtle race condition that could compromise system safety.";
    const result = rewriteHypotheticalToRecall(input);
    expect(result).toMatch(/Tell me about a time/);
    expect(isHypotheticalFraming(result)).toBe(false);
  });
});

describe('rewriteHypotheticalBehavioralTurn', () => {
  const baseTurn = {
    phase: 'core' as const,
    is_question: true,
    is_follow_up: false,
    speech: "Imagine you've just deployed a critical bug. What do you do?",
    display_question: "Imagine you've just deployed a critical bug. What do you do?",
    question_type: 'behavioral' as const,
    tip: null,
    timer_seconds: 180,
    reading_buffer_seconds: 4,
    auto_submit: false,
    allow_skip: true,
    show_auto_structure: true,
    question_difficulty: 'medium' as const,
    interviewer_emotion: 'neutral' as const,
  };

  it('rewrites a behavioral core question with hypothetical framing', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const result = rewriteHypotheticalBehavioralTurn(baseTurn, {
      isBehavioral: true,
      interviewId: 'iv-1',
      turnIndex: 3,
    });
    expect(result.speech).not.toMatch(/imagine/i);
    expect(result.display_question).not.toMatch(/imagine/i);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(warnSpy.mock.calls[0][0]).toContain('turn_hypothetical_framing_rewritten');
    warnSpy.mockRestore();
  });

  it('does not rewrite a technical question even with hypothetical framing', () => {
    const result = rewriteHypotheticalBehavioralTurn(baseTurn, {
      isBehavioral: false,
      interviewId: 'iv-1',
      turnIndex: 3,
    });
    expect(result.speech).toBe(baseTurn.speech);
  });

  it('does not rewrite a clean behavioral question', () => {
    const clean = {
      ...baseTurn,
      speech: 'Tell me about a time you missed a deadline.',
      display_question: 'Tell me about a time you missed a deadline.',
    };
    const result = rewriteHypotheticalBehavioralTurn(clean, {
      isBehavioral: true,
      interviewId: 'iv-1',
      turnIndex: 3,
    });
    expect(result.speech).toBe(clean.speech);
    expect(result.display_question).toBe(clean.display_question);
  });

  it('does not touch non-core phases', () => {
    const warmup = { ...baseTurn, phase: 'warmup' as const };
    const result = rewriteHypotheticalBehavioralTurn(warmup, {
      isBehavioral: true,
      interviewId: 'iv-1',
      turnIndex: 0,
    });
    expect(result.speech).toBe(warmup.speech);
  });
});
