import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { authPageMetadata } from '@/lib/seo/metadata';
import { CollegeSignupForm } from './CollegeSignupForm';
import { ChevronLeft } from 'lucide-react';

export const metadata = authPageMetadata({
  title: 'T&P Officer Signup',
  description: 'Register your college T&P office to manage student placement training.',
  path: '/college/signup',
});

export default async function CollegeSignupPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (status === 'pending') {
    redirect('/college/setup?status=pending');
  }

  if (user) {
    redirect('/college/setup');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{ background: 'var(--bg-primary)' }}>
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            href="/campus"
            className="inline-flex items-center gap-1 text-sm font-medium transition-colors hover:opacity-70"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ChevronLeft className="h-4 w-4" aria-hidden />
            Back to Campus overview
          </Link>
        </div>
        <CollegeSignupForm />
      </div>
    </div>
  );
}
