import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { StartInterviewForm } from './StartInterviewForm';
import { privatePageMetadata } from '@/lib/seo/metadata';
import type { DomainPack, PlanTier } from '@/types/app.types';
import { coerceParsedResume } from '@/lib/resume/coerce-parsed-resume';

export const metadata = privatePageMetadata({
  title: 'Start interview',
  description: 'Configure and start a new AI mock interview.',
  path: '/interview/new',
});

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

  const resumeProfile = coerceParsedResume(resume.parsed_data);
  const resumeInfo = {
    targetRole: resumeProfile.target_role,
    skillCount: resumeProfile.skills.length,
    experienceEstimate: resumeProfile.experience_estimate,
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
