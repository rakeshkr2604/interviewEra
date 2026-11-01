import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as campus from '@/lib/landing/campus-content';
import { LANDING_FAQS, LANDING_FAQ_REGISTRY } from '@/lib/landing/faq-content';
import {
  HOME_DSA_ROADMAP,
  HOME_FREE_TOOLS,
  HOME_FREE_TOOLS_NOTE,
  HOME_PREP_COMPARISON,
} from '@/lib/landing/home-content';
import { TIMELINE_READY, TIMELINE_STAGE_COPY } from '@/lib/landing/timeline-content';
import { FREE_PLAN, PAID_PLANS } from '@/lib/pricing/plans';

const campusCopy = JSON.stringify(campus);
const homeCopy = JSON.stringify({ HOME_FREE_TOOLS, HOME_FREE_TOOLS_NOTE, HOME_PREP_COMPARISON, HOME_DSA_ROADMAP });

describe('homepage + campus redesign copy guardrails', () => {
  it('lists the four free tools at their real routes', () => {
    expect(HOME_FREE_TOOLS.map((tool) => tool.href)).toEqual([
      '/tools/ats-checker',
      '/tools/question-generator',
      '/tools/star-builder',
      '/tools/prompt-builder',
    ]);
    expect(HOME_FREE_TOOLS_NOTE.badge).toBe('Free with a registered InterviewEra account.');
    expect(HOME_FREE_TOOLS_NOTE.detail).toMatch(/without consuming mock-interview credits/i);
    expect(HOME_FREE_TOOLS_NOTE.detail).toMatch(/fair-use limits apply/i);
  });

  it('never claims free tools need no signup', () => {
    expect(homeCopy).not.toMatch(/no sign-?up/i);
  });

  it('marks DSA as planned, not available', () => {
    expect(HOME_DSA_ROADMAP.body).toMatch(/January 2027/);
    expect(HOME_DSA_ROADMAP.disclosure).toBe('Planned feature. Not currently available.');
    expect(LANDING_FAQ_REGISTRY.dsa.a).toMatch(/not currently available/i);
  });

  it('homepage FAQ covers the required pricing and tool questions', () => {
    const questions = LANDING_FAQS.map((faq) => faq.q.toLowerCase());
    for (const fragment of [
      'what is interviewera',
      'free preparation tools work',
      'account required',
      'consume mock-interview credits',
      'free mock-interview credits',
      'mock-interview credit mean',
      'answers evaluated',
      'resume-aware',
      'starter and pro',
      'paid plans valid',
      'recurring',
      'credits are used',
      'dsa',
    ]) {
      expect(questions.some((q) => q.includes(fragment)), fragment).toBe(true);
    }
  });

  it('FAQ pricing answers follow canonical plan config', () => {
    expect(LANDING_FAQ_REGISTRY.freeCredits.a).toContain(`${FREE_PLAN.credits} lifetime`);
    expect(LANDING_FAQ_REGISTRY.starterVsPro.a).toContain(`₹${PAID_PLANS.starter.amountInr}`);
    expect(LANDING_FAQ_REGISTRY.starterVsPro.a).toContain(`₹${PAID_PLANS.pro.amountInr}`);
    expect(LANDING_FAQ_REGISTRY.recurring.a).toMatch(/no auto-renewal/i);
  });

  it('timeline no longer advertises outdated free-interview counts', () => {
    const copy = JSON.stringify({ TIMELINE_STAGE_COPY, TIMELINE_READY });
    expect(copy).not.toMatch(/free interviews/i);
    expect(copy).toContain(`${FREE_PLAN.credits} lifetime mock-interview credits`);
  });

  it('campus copy makes no unlimited, ROI or agency-price claims', () => {
    expect(campusCopy).not.toMatch(/unlimited/i);
    expect(campusCopy).not.toMatch(/\bROI\b|offsets the per-seat cost|training agencies/i);
    expect(campusCopy).toMatch(/₹799 per student per year/);
    expect(campusCopy).toMatch(/Minimum 50 seats/);
    expect(campusCopy).toMatch(/30-day pilot for up to 20 students/);
  });

  it('campus copy names the real five evaluation dimensions', () => {
    expect(campusCopy).not.toMatch(/technical depth|confidence, relevance/i);
    for (const dimension of [
      'Communication Clarity',
      'Content Accuracy',
      'Answer Structure',
      'Specificity',
      'Relevance',
    ]) {
      expect(campusCopy).toContain(dimension);
    }
  });

  it('campus client never claims scores are locked behind STAR completion', () => {
    const client = readFileSync(
      join(process.cwd(), 'src/components/landing/campus/CampusLandingClient.tsx'),
      'utf8',
    );
    expect(client).not.toMatch(/score locked|score release|unlimited/i);
  });
});
