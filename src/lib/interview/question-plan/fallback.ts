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

/** HR-round angles: motivation, ownership, conflict, failure, feedback. Never technical. */
function behavioralAngles(facts: ReturnType<typeof slotFacts>): string[] {
  const { project, role } = facts;
  const angles = [
    project
      ? `Tell me about a decision you owned on ${project}. What was at stake, what did you do, and what was the result?`
      : `Tell me about a time you took ownership of something that was not strictly your responsibility. What did you do, and what was the result?`,
    project
      ? `Describe a disagreement with a teammate while working on ${project}. What did you specifically do, and how did it end?`
      : `Describe a time you disagreed with a teammate or manager. How did you handle it, and what was the outcome?`,
    `Tell me about a time you had to meet a tight deadline while juggling other work. How did you prioritise, and what happened?`,
    `Why do you want to work as a ${role}, and why should we pick you over other candidates?`,
    `What is one real weakness you have, and give me an example of what you are doing about it.`,
    project
      ? `When ${project} did not go as planned, what did you personally take responsibility for, and what did you learn?`
      : `Tell me about a time you failed at something important. What did you learn, and what did you change afterward?`,
    `Tell me about a piece of critical feedback you received. How did you react, and what did you change?`,
    `Where do you see your career in the next three to five years, and how does this role fit into that?`,
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
    `What motivates you in a ${role} job, and give me an example of a time that motivation was tested.`,
    `Describe a time you had to work with someone who was difficult to work with. What did you do, and what changed?`,
    `Tell me about a commitment you could not keep. How did you handle it, and what did you learn?`,
    `Give me an example of a time you went beyond what was expected of you. What did you do, and what was the result?`,
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
