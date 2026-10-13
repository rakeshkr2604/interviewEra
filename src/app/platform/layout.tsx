import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { PlatformChrome } from '@/components/layout/PlatformChrome';
import { getVerifiedPlatformUser, isPlatformAdminUser } from '@/lib/admin/auth';
import { privatePageMetadata } from '@/lib/seo/metadata';

export const metadata: Metadata = privatePageMetadata({
  title: 'Platform Admin',
  description: 'InterviewEra platform administrator console.',
  path: '/platform',
});

export default async function PlatformLayout({ children }: { children: React.ReactNode }) {
  const user = await getVerifiedPlatformUser();
  if (!user) redirect('/login?next=/platform/analytics');

  const allowed = await isPlatformAdminUser(user.id, user.email);
  if (!allowed) {
    redirect('/dashboard');
  }

  return <PlatformChrome>{children}</PlatformChrome>;
}
