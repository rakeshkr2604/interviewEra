'use client';

import type { AuthIntent } from '@/lib/auth/auth-intent';
import { SignupForm } from '@/app/(auth)/signup/SignupForm';
import { CollegeSignupFields } from '@/components/auth/CollegeSignupFields';

interface SignupPageClientProps {
  intent: AuthIntent;
  next?: string;
  email?: string;
}

export function SignupPageClient({ intent, next, email }: SignupPageClientProps) {
  if (intent === 'college') {
    return <CollegeSignupFields />;
  }

  if (intent === 'business') {
    return <SignupForm next={next} email={email} intent="business" />;
  }

  return <SignupForm next={next} email={email} intent={intent} />;
}
