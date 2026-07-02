import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PlatformChrome } from '@/components/layout/PlatformChrome';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = privatePageMetadata({
  title: 'Platform Admin',
  description: 'InterviewEra platform administrator console.',
  path: '/platform',
});

function getPlatformAdminEmails(): Set<string> {
  const raw = process.env.ADMIN_EMAILS ?? '';
  return new Set(
    raw.split(',').map((e) => e.trim().toLowerCase()).filter(Boolean),
  );
}

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/platform/analytics');

  const adminEmails = getPlatformAdminEmails();
  const isEmailAdmin = !!user.email && adminEmails.has(user.email.toLowerCase());

  let isRoleAdmin = false;
  if (!isEmailAdmin) {
    const svc = createServiceClient();
    const { data: profile } = await svc
      .from('users')
      .select('platform_role')
      .eq('id', user.id)
      .single();
    isRoleAdmin = profile?.platform_role === 'admin';
  }

  if (!isEmailAdmin && !isRoleAdmin) {
    redirect('/dashboard');
  }

  return <PlatformChrome>{children}</PlatformChrome>;
}
