import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { authPageMetadata } from '@/lib/seo/metadata';
import { CollegeSignupForm } from './CollegeSignupForm';

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
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <CollegeSignupForm />
      </div>
    </div>
  );
}
