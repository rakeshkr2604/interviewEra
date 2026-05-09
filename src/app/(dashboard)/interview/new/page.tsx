import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StartInterviewForm } from './StartInterviewForm';
import type { DomainPack, ParsedResume, PlanTier } from '@/types/app.types';

export const metadata: Metadata = {
  title: 'Start interview',
  robots: { index: false, follow: false },
};

export default async function NewInterviewPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // Fetch user profile + latest resume + domain packs in parallel
  const [{ data: profile }, { data: resume }, { data: domainPacks }] = await Promise.all([
    supabase
      .from('users')
      .select('credits_remaining, plan_tier')
      .eq('id', user.id)
      .single(),
    supabase
      .from('resumes')
      .select('id, parsed_data, status')
      .eq('user_id', user.id)
      .eq('status', 'parsed')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('domain_packs')
      .select('id, name, domain, description, question_count, is_active')
      .eq('is_active', true)
      .order('name'),
  ]);

  const creditsRemaining = profile?.credits_remaining ?? 0;
  const planTier = (profile?.plan_tier ?? 'free') as PlanTier;

  if (!resume) {
    redirect('/dashboard?notice=upload_resume');
  }

  const parsed = resume.parsed_data as ParsedResume | null;
  const resumeInfo = {
    name: parsed?.name ?? 'Your Resume',
    skillCount: parsed?.skills?.length ?? 0,
  };

  return (
    <StartInterviewForm
      resumeId={resume.id}
      resumeInfo={resumeInfo}
      creditsRemaining={creditsRemaining}
      planTier={planTier}
      domainPacks={(domainPacks ?? []) as DomainPack[]}
    />
  );
}
