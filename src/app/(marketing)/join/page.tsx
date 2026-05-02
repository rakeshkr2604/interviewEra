import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';

interface JoinPageProps {
  searchParams: Promise<{ ref?: string }>;
}

export default async function JoinPage({ searchParams }: JoinPageProps) {
  const { ref } = await searchParams;

  if (ref) {
    // Store referral code in a cookie (30-day expiry)
    const cookieStore = await cookies();
    cookieStore.set('referral_code', ref, {
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
      sameSite: 'lax',
    });
  }

  redirect('/signup');
}
