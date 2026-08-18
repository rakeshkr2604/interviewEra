import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { InterviewResumeSnapshot } from '../../src/lib/session/interview-resume-snapshot';
import { Q3_QUESTION_TEXT } from './interview-resume-mocks';
import { loadSelectedE2eEnvironment } from './e2e-environment';

loadSelectedE2eEnvironment();

const STORAGE_PATH = join(process.cwd(), 'e2e', '.auth', 'user.json');

const RUBRIC = { ideal_keywords: [], ideal_structure: '', red_flags: [] };

const SEED_QUESTIONS = [
  'Tell me about yourself.',
  'Describe a challenging project.',
  Q3_QUESTION_TEXT,
];

function createServiceAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !serviceKey) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }
  return createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export function resolveE2eUserIdFromStorage(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is required for integration tests');
  }

  const storage = JSON.parse(readFileSync(STORAGE_PATH, 'utf8')) as {
    cookies: Array<{ name: string; value: string }>;
  };
  const ref = new URL(url).hostname.split('.')[0];
  const cookieName = `sb-${ref}-auth-token`;
  const cookie = storage.cookies.find((c) => c.name === cookieName);
  if (!cookie) {
    throw new Error(`E2E auth cookie not found: ${cookieName}`);
  }

  const session = JSON.parse(decodeURIComponent(cookie.value)) as {
    user?: { id?: string };
  };
  if (!session.user?.id) {
    throw new Error('E2E session user id not found in storage state');
  }
  return session.user.id;
}

export async function resolveE2eUserId(admin: SupabaseClient): Promise<string> {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  if (email) {
    const { data, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
    if (error) throw error;

    const user = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (!user?.id) {
      throw new Error(`E2E user not found for email: ${email}`);
    }
    return user.id;
  }

  return resolveE2eUserIdFromStorage();
}

function bootstrapResumeSnapshot(): InterviewResumeSnapshot {
  return {
    version: 1,
    questionIndex: 2,
    phase: 'candidate_answering',
    transcript: '',
    timerRemaining: 45,
    timerBudget: 60,
    skipCount: 1,
    pendingFollowUp: null,
    inputMode: 'text',
    followUpForIndex: -1,
    updatedAt: new Date().toISOString(),
  };
}

export type SeededInterviewFixture = {
  interviewId: string;
  resumeId: string;
  questionIds: string[];
};

export async function seedResumableInterview(userId: string): Promise<SeededInterviewFixture> {
  const admin = createServiceAdmin();

  const { data: resume, error: resumeError } = await admin
    .from('resumes')
    .insert({
      user_id: userId,
      status: 'parsed',
      raw_text: 'E2E integration fixture resume',
      parsed_data: { name: 'E2E User' },
    })
    .select('id')
    .single();

  if (resumeError || !resume) {
    throw new Error(`Failed to seed resume: ${resumeError?.message ?? 'unknown'}`);
  }

    const { data: existingActive } = await admin
      .from('interviews')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['pending', 'in_progress']);

    if (existingActive && existingActive.length > 0) {
      const { error: abandonError } = await admin
        .from('interviews')
        .update({ status: 'abandoned', completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .in('status', ['pending', 'in_progress']);
      if (abandonError) {
        throw new Error(`Failed to clear active interviews before seed: ${abandonError.message}`);
      }
    }

    const { data: interview, error: interviewError } = await admin
    .from('interviews')
    .insert({
      user_id: userId,
      resume_id: resume.id,
      role: 'Software Engineer',
      difficulty: 'medium',
      question_count: 3,
      status: 'in_progress',
      interviewer_id: 'priya',
      started_at: new Date().toISOString(),
      session_context: { resume: bootstrapResumeSnapshot() },
    })
    .select('id')
    .single();

  if (interviewError || !interview) {
    await admin.from('resumes').delete().eq('id', resume.id);
    throw new Error(`Failed to seed interview: ${interviewError?.message ?? 'unknown'}`);
  }

  const questionIds: string[] = [];

  for (let i = 0; i < SEED_QUESTIONS.length; i++) {
    const { data: question, error: questionError } = await admin
      .from('questions')
      .insert({
        interview_id: interview.id,
        order_index: i,
        question_text: SEED_QUESTIONS[i],
        rubric: RUBRIC,
        category: 'behavioral',
      })
      .select('id')
      .single();

    if (questionError || !question) {
      await deleteInterviewFixture(interview.id, resume.id);
      throw new Error(`Failed to seed question ${i}: ${questionError?.message ?? 'unknown'}`);
    }
    questionIds.push(question.id);
  }

  for (let i = 0; i < 2; i++) {
    const { error: answerError } = await admin.from('answers').insert({
      question_id: questionIds[i],
      answer_text: i === 0 ? 'First answer text' : 'Second answer text',
      answer_mode: 'text',
      duration_seconds: 30,
    });
    if (answerError) {
      await deleteInterviewFixture(interview.id, resume.id);
      throw new Error(`Failed to seed answer ${i}: ${answerError.message}`);
    }
  }

  return { interviewId: interview.id, resumeId: resume.id, questionIds };
}

export async function deleteInterviewFixture(interviewId: string, resumeId?: string): Promise<void> {
  const admin = createServiceAdmin();

  let resolvedResumeId = resumeId;
  if (!resolvedResumeId) {
    const { data } = await admin.from('interviews').select('resume_id').eq('id', interviewId).single();
    resolvedResumeId = data?.resume_id as string | undefined;
  }

  await admin.from('interviews').delete().eq('id', interviewId);
  if (resolvedResumeId) {
    await admin.from('resumes').delete().eq('id', resolvedResumeId);
  }
}

export async function readResumeSnapshot(interviewId: string): Promise<InterviewResumeSnapshot | null> {
  const admin = createServiceAdmin();
  const { data, error } = await admin
    .from('interviews')
    .select('session_context')
    .eq('id', interviewId)
    .single();

  if (error || !data) return null;

  const ctx = data.session_context as { resume?: InterviewResumeSnapshot } | null;
  return ctx?.resume ?? null;
}
