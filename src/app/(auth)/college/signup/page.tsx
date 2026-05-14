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

export default async function CollegeSignupPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <div className="mb-4">
          <Link
            href="/college"
            className="inline-flex items-center gap-1 text-sm font-medium text-gray-500 transition-colors hover:text-gray-800"
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
