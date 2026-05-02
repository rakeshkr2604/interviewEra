import { redirect } from 'next/navigation';
import { createClient, createServiceClient } from '@/lib/supabase/server';
import { AdminTopBar } from '@/components/admin/AdminTopBar';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const serviceClient = createServiceClient();
  const { data: profile } = await serviceClient
    .from('users')
    .select('plan_tier')
    .eq('id', user.id)
    .single();

  if (profile?.plan_tier !== 'campus_admin') {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <AdminTopBar />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">{children}</main>
    </div>
  );
}
