'use client';

import type { AuthIntent } from '@/lib/auth/auth-intent';
import { SignupForm } from '@/app/(auth)/signup/SignupForm';
import { CollegeSignupFields } from '@/components/auth/CollegeSignupFields';
import { HiringSignupFields } from '@/components/auth/HiringSignupFields';
import type { PaidPlanId } from '@/lib/pricing/plans';

interface SignupPageClientProps {
  intent: AuthIntent;
  next?: string;
  email?: string;
  selectedPlan?: PaidPlanId;
}

export function SignupPageClient({ intent, next, email, selectedPlan }: SignupPageClientProps) {
  if (intent === 'college') {
    return <CollegeSignupFields />;
  }

  if (intent === 'business') {
    return <HiringSignupFields />;
  }

  return <SignupForm next={next} email={email} intent={intent} selectedPlan={selectedPlan} />;
}
