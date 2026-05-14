import Link from 'next/link';
import MarketingLayout from '@/app/(marketing)/layout';
import { HomeMoneyPageLinks } from '@/components/seo/HomeMoneyPageLinks';
import LandingHero from '@/components/landing/LandingHero';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { PAGE_SEO } from '@/lib/seo/metadata';
import { Users, BarChart2, ShieldCheck, ArrowRight } from 'lucide-react';

export const metadata = PAGE_SEO.home;
/** Static/ISR homepage — no `cookies()` so document can cache + bfcache eligibility improves. */
export const revalidate = 3600;

function HeroBetaPill() {
  return (
    <>
      AI mock interviews · Rubric-scored feedback · Built for Indian campus hiring
    </>
  );
}

const COLLEGE_FEATURES = [
  {
    icon: Users,
    title: 'Bulk Student Onboarding',
    desc: 'Invite your entire batch via CSV in under 2 minutes. Students get personalised setup emails automatically.',
  },
  {
    icon: BarChart2,
    title: 'Cohort Analytics Dashboard',
    desc: 'Track tier distribution, score trends, completion rates, and placement readiness across your batch in real time.',
  },
  {
    icon: ShieldCheck,
    title: 'Role-Based Access',
    desc: 'T&P officers get a dedicated admin console with per-student drill-down. Students see only their own progress.',
  },
] as const;

function ForCollegesSection() {
  return (
    <section className="border-t border-gray-100 bg-gray-50 px-4 py-20 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex justify-center">
          <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
            For T&amp;P Officers &amp; Placement Cells
          </span>
        </div>
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-bold text-gray-900">
            Prepare your entire batch — not just a few
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            InterviewEra Campus gives your placement cell a dedicated dashboard to manage, track,
            and accelerate every student's interview readiness.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {COLLEGE_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
                <Icon className="h-5 w-5 text-blue-600" />
              </span>
              <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
              <p className="mt-2 text-sm text-gray-500">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/college/signup"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            Sign Up Your College
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/college"
            className="inline-flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
          >
            Learn More
          </Link>
        </div>
        <p className="mt-4 text-center text-xs text-gray-400">
          Annual plans from ₹49,999 · No per-student overage fees
        </p>
      </div>
    </section>
  );
}

export default function Page() {
  return (
    <MarketingLayout>
      <main id="main-content">
        <LandingHero
          countPill={<HeroBetaPill />}
        />
        <LandingHomeClient />
        <ForCollegesSection />
        <HomeMoneyPageLinks />
      </main>
    </MarketingLayout>
  );
}
