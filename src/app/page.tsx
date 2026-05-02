import type { Metadata } from 'next';
import MarketingLayout from '@/app/(marketing)/layout';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/session';
import LandingHomeClient from '@/components/landing/LandingHomeClient';

export const metadata: Metadata = {
  title: 'InterviewEra — Raise placement odds with resume-based AI interviews',
  description:
    'Structured mock interviews from your CV — STAR-aligned flow, five-dimension scoring, and progress built for Indian campus hiring. Start free, no card.',
};

export default async function Page() {
  const supabase = await createClient();
  const user = await getServerUser(supabase);

  const { count: studentCount } = await supabase
    .from('users')
    .select('id', { count: 'exact', head: true });

  const displayCount =
    studentCount && studentCount > 10
      ? `${studentCount.toLocaleString('en-IN')}+`
      : '1,000+';

  return (
    <MarketingLayout>
      <LandingHomeClient isLoggedIn={!!user} displayCount={displayCount} />
    </MarketingLayout>
  );
}
