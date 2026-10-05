/**
 * Candidate-specific fallback questions used when generation is short or fails.
 * Templates are filled from the candidate's role, skills, projects, and JD.
 * They are not a fixed question bank.
 */

import { findCoreDuplicate, normalizeCoreQuestion } from './duplicate';
import type { CoreQuestionType, QuestionPlanContext } from './types';

const BANNED = [
  'what is the difference between stack memory and heap memory',
  'how does a database index actually work internally',
  'tell me about a time you disagreed with a classmate project teammate or internship mentor',
  'explain the cap theorem',
].map((text) => normalizeCoreQuestion(text));

export interface FallbackContext extends QuestionPlanContext {
  slot: number;
  questionType: CoreQuestionType;
}

function phraseList(values: readonly string[]): string[] {
  return values.map((value) => value.trim()).filter((value) => value.length > 1);
}

export function jdFocusPhrase(jobDescription: string | undefined): string | null {
  const text = jobDescription?.replace(/\s+/g, ' ').trim();
  if (!text) return null;
  const sentence = text.split(/[.!?]/)[0]?.trim() ?? text;
  return sentence.slice(0, 120);
}

function slotFacts(context: QuestionPlanContext, slot: number): {
  skill: string;
  project: string | null;
  jd: string | null;
  role: string;
} {
  const skills = phraseList(context.skills);
  const projects = phraseList(context.projects);
  const role = context.role.trim() || 'this role';
  return {
    role,
    skill: skills.length > 0 ? skills[slot % skills.length]! : role,
    project: projects.length > 0 ? projects[slot % projects.length]! : null,
    jd: jdFocusPhrase(context.jobDescription),
  };
}

function technicalAngles(facts: ReturnType<typeof slotFacts>): string[] {
  const { skill, project, jd, role } = facts;
  const angles = [
    project
      ? `In ${project}, what trade-off did you make around ${skill}, and what would you change if you rebuilt that part?`
      : `For a ${role} working with ${skill}, what trade-off would you make when the straightforward approach stops scaling?`,
    project
      ? `Walk me through a failure or bug in ${project} that involved ${skill}. How did you find it, and what did you change?`
      : `Walk me through how you would debug a production failure in a ${role} system that depends on ${skill}.`,
    `How would you design the data flow for a ${role} feature that uses ${skill}? What would you measure to know it worked?`,
    jd
      ? `This role emphasizes "${jd}". How would you use ${skill} to meet that, and what would you refuse to compromise on?`
      : `What design decision should a ${role} make early when adopting ${skill}, and which alternative would you reject?`,
    project
      ? `If ${project} had to handle ten times the traffic, which ${skill} decision would you revisit first, and why?`
      : `Which ${skill} choice would you revisit first if a ${role} system had to handle ten times the current traffic?`,
    project
      ? `What would you instrument in ${project} so another engineer could explain a ${skill} failure without guessing?`
      : `What would you instrument so another ${role} could explain a ${skill} failure without guessing?`,
  ];
  return angles;
}

function behavioralAngles(facts: ReturnType<typeof slotFacts>): string[] {
  const { skill, project, jd, role } = facts;
  const angles = [
    project
      ? `Tell me about a decision you owned on ${project}. What was at stake, what did you do, and what was the result?`
      : `Tell me about a time you had to learn ${skill} quickly for a ${role} task. What did you do, and what was the outcome?`,
    project
      ? `Describe a disagreement about how to build ${project}. What did you specifically do, and how did it end?`
      : `Describe a time you disagreed with a teammate about a ${role} decision involving ${skill}. What did you do, and what was the outcome?`,
    project
      ? `On ${project}, tell me about a priority you had to drop. How did you choose, and what happened afterward?`
      : `Tell me about a time you had to drop a priority while doing ${role} work. How did you choose, and what was the result?`,
    jd
      ? `The role calls out "${jd}". Tell me about a time your experience with ${skill} prepared you for that kind of work. What did you do?`
      : `Tell me about a time ${skill} changed how you worked with other people on a ${role} problem. What did you do, and what was the outcome?`,
    project
      ? `What feedback did you receive while building ${project}, and what did you change because of it?`
      : `What feedback have you acted on while developing ${skill} for ${role} work, and what changed afterward?`,
    project
      ? `When ${project} did not go as planned, what did you personally take responsibility for?`
      : `Tell me about a ${role} setback involving ${skill}. What did you personally take responsibility for, and what was the outcome?`,
  ];
  return angles;
}

function isBanned(text: string): boolean {
  const normalized = normalizeCoreQuestion(text);
  return BANNED.some(
    (banned) => normalized === banned || normalized.includes(banned) || banned.includes(normalized),
  );
}

function emergencyAngles(role: string, questionType: CoreQuestionType): string[] {
  if (questionType === 'technical') {
    return [
      `What trade-off would you defend in a design review for a ${role} system, and which option would you reject?`,
      `How would you find the bottleneck in a ${role} system that got slower after a normal release?`,
      `Which data would you capture before changing a ${role} workflow, and what would a bad metric hide?`,
      `When would you keep a simpler ${role} design even though a more general one is available?`,
    ];
  }
  return [
    `Tell me about a ${role} decision you would make differently now. What did you do, and what was the outcome?`,
    `Describe a time you had to ask for help on ${role} work. What did you do, and what changed?`,
    `Tell me about a commitment you could not keep on a ${role} task. How did you handle it?`,
    `What feedback changed how you collaborate on ${role} work, and what did you do next?`,
  ];
}

/** Last non-duplicate core when the personalized angles are exhausted. */
export function emergencyCoreQuestion(opts: {
  role: string;
  questionType: CoreQuestionType;
  blocked: readonly string[];
}): string | null {
  const role = opts.role.trim() || 'this role';
  for (const text of emergencyAngles(role, opts.questionType)) {
    if (isBanned(text)) continue;
    if (findCoreDuplicate(text, opts.blocked).duplicate) continue;
    return text;
  }
  return null;
}

/**
 * Next fallback line for a slot. Returns null when every angle collides with
 * questions already selected, already asked, or previously rejected.
 */
export function nextFallbackQuestion(opts: {
  context: QuestionPlanContext;
  questionType: CoreQuestionType;
  slot: number;
  blocked: readonly string[];
}): { text: string; personalized: boolean } | null {
  const facts = slotFacts(opts.context, opts.slot);
  const personalized = Boolean(
    opts.context.skills.length > 0 ||
      opts.context.projects.length > 0 ||
      opts.context.jobDescription?.trim(),
  );
  const angles =
    opts.questionType === 'technical' ? technicalAngles(facts) : behavioralAngles(facts);
  for (let offset = 0; offset < angles.length; offset += 1) {
    const text = angles[(opts.slot + offset) % angles.length]!;
    if (isBanned(text)) continue;
    if (findCoreDuplicate(text, opts.blocked).duplicate) continue;
    return { text, personalized };
  }
  return null;
}
