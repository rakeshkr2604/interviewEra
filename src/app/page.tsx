import MarketingLayout from '@/app/(marketing)/layout';
import { createClient } from '@/lib/supabase/server';
import { getServerUser } from '@/lib/supabase/session';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;

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
