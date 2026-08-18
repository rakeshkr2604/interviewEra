import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { loadProfileOnboardingState } from '@/lib/profile/load-onboarding-state';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { WelcomeOnboardingClient } from './WelcomeOnboardingClient';

export const metadata = privatePageMetadata({
  title: 'Welcome',
  description: 'Complete your InterviewEra preparation profile.',
  path: '/welcome',
});

export const dynamic = 'force-dynamic';

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/welcome');

  const loaded = await loadProfileOnboardingState(supabase, user.id);
  if (!loaded) redirect('/dashboard');

  const edit = (await searchParams).edit === '1';
  if (loaded.resolution.state === 'complete' && !edit) redirect('/dashboard');

  return (
    <WelcomeOnboardingClient
      initial={{
        state: loaded.resolution.state,
        completionPercentage: loaded.resolution.completionPercentage,
        completedFields: loaded.resolution.completedFields,
        missingFields: loaded.resolution.missingFields,
        firstMissingStep: edit ? 1 : loaded.resolution.firstMissingStep,
        profile: {
          name: loaded.resolution.name,
          preferredRole: loaded.resolution.preferredRole,
          experienceLevel: loaded.resolution.experienceLevel,
        },
        resume: loaded.activeResume
          ? {
              id: loaded.activeResume.id,
              status: loaded.activeResume.status,
              isPrimary: loaded.activeResume.isPrimary,
            }
          : null,
      }}
    />
  );
}
