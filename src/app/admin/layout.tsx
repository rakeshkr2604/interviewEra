import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { AdminTopBar } from '@/components/admin/AdminTopBar';
import { privatePageMetadata } from '@/lib/seo/metadata';
import { isPlatformAdminUser } from '@/lib/admin/auth';
import { createClient, createServiceClient } from '@/lib/supabase/server';

export const metadata: Metadata = privatePageMetadata({
  title: 'Campus Admin',
  description: 'InterviewEra campus administrator console.',
  path: '/admin',
});

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const svc = createServiceClient();
  const { data: profile } = await svc
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  if (profile?.plan_tier !== 'campus_admin') {
    if (await isPlatformAdminUser(user.id, user.email)) {
      redirect('/college/dashboard');
    }
    redirect('/dashboard');
  }

  const { data: org } = await svc
    .from('campus_organizations')
    .select('verification_status')
    .eq('admin_user_id', user.id)
    .single();
  if (org?.verification_status !== 'approved') {
    redirect('/college/signup?status=pending');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AdminTopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
