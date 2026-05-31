import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight, BookOpen, Clock } from 'lucide-react';
import { BlogMarketingShell } from '@/components/blog/BlogMarketingShell';
import { generateMetadata } from '@/lib/seo/metadata';
import { cn } from '@/lib/utils';

export const metadata: Metadata = generateMetadata({
  title: 'Blog',
  description:
    'Practical interview preparation guides: DSA topic maps, HR answer frameworks, placement prep, STAR method, and software engineer interview questions.',
  path: '/blog',
});

export const revalidate = 3600;

const BLOG_POSTS = [
  {
    title: "Why Good Students Don't Get Internships (And What Actually Works)",
    description:
      'Good students miss internships because of weak signal, low volume, and poor interview conversion — not missing skills. Signal → Volume → Conversion explained.',
    href: '/blog/how-to-get-internship-opportunities',
    category: 'Career',
    readTime: '14 min read',
  },
  {
    title: "Your English Isn't Costing You the Interview. Your Delivery Is.",
    description:
      'Interview English is rarely the bottleneck. Learn why clarity, structure, and confidence matter more for placement interviews — and how to improve delivery.',
    href: '/blog/english-confidence-interviews',
    category: 'Interview Prep',
    readTime: '11 min read',
  },
  {
    title: 'Why You Freeze in Interviews — And How Mock Practice Fixes It',
    description:
      'Interview anxiety blocks strong answers — not knowledge. Learn why you freeze and how mock interviews retrain your brain before placements.',
    href: '/blog/overcome-interview-anxiety-mock-interviews',
    category: 'Interview Prep',
    readTime: '10 min read',
  },
  {
    title: 'Top 10 Interview Questions for Freshers in India 2026',
    description:
      'Honest sample answers, common mistakes, and scoring tips for the fresher interview questions asked across Indian campus placements.',
    href: '/blog/top-10-interview-questions-freshers-india-2026',
    category: 'Fresher Interviews',
    readTime: '10 min read',
  },
  {
    title: 'Why AI Mock Interviews Are the Smartest Way to Prepare in 2026',
    description:
      'Struggling with interview prep? Discover why AI mock interviews beat YouTube tutorials and friend practice — with real feedback, zero judgment, and 24/7 availability.',
    href: '/blog/ai-mock-interviews-smartest-prep-2026',
    category: 'AI mock interviews',
    readTime: '6 min read',
  },
  {
    title: 'Top DSA Interview Questions & Topic Map (2026)',
    description:
      'Topic frequency chart, classic patterns by area, and an illustrative prep timeline — prioritize what actually gets asked.',
    href: '/blog/top-dsa-interview-questions',
    category: 'DSA & Coding',
    readTime: '14 min read',
  },
  {
    title: 'HR Interview Answer Tips & Tricks (With Visual Frameworks)',
    description:
      'Radar model for answer quality plus a step-by-step delivery flow for HR and managerial rounds.',
    href: '/blog/hr-interview-answer-tips-and-tricks',
    category: 'HR Round',
    readTime: '11 min read',
  },
  {
    title: 'How to Prepare for Placement Interviews: A Complete Guide for Indian Students',
    description:
      'A complete roadmap from DSA preparation to HR rounds and mock interview strategy.',
    href: '/blog/how-to-prepare-for-placement-interviews',
    category: 'Placement Guide',
    readTime: '15 min read',
  },
  {
    title: 'Top Interview Questions for Software Engineers (2026)',
    description:
      'Most frequently asked SWE interview questions across DSA, system design, and behavioral rounds.',
    href: '/blog/top-interview-questions-for-software-engineers',
    category: 'Question Bank',
    readTime: '12 min read',
  },
  {
    title: 'What Is the STAR Method? With Examples for Indian Students',
    description:
      'Understand STAR with practical examples you can directly adapt in behavioral interviews.',
    href: '/blog/what-is-star-method-with-examples',
    category: 'Behavioral Interviews',
    readTime: '10 min read',
  },
] as const;

export default function BlogIndexPage() {
  return (
    <BlogMarketingShell>
      <div className="space-y-12 sm:space-y-16 lg:space-y-20">
        <header className="mx-auto max-w-3xl text-center lg:max-w-4xl">
          <div
            className="mx-auto mb-5 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium tracking-wide sm:mb-6"
            style={{
              borderColor: 'var(--card-border)',
              background: 'color-mix(in srgb, var(--accent-primary) 10%, transparent)',
              color: 'var(--text-primary)',
            }}
          >
            <BookOpen className="size-3.5" style={{ color: 'var(--accent-primary)' }} aria-hidden />
            Blog
          </div>
          <h1 className="text-balance text-[2rem] font-bold leading-[1.08] tracking-tight sm:text-4xl md:text-5xl md:leading-[1.05]">
            Interview preparation guides
          </h1>
          <p
            className="mx-auto mt-4 max-w-2xl text-base leading-relaxed sm:mt-5 sm:text-lg"
            style={{ color: 'var(--text-secondary)' }}
          >
            Actionable articles for placement and software interview prep — written for Indian students and early-career
            engineers.
          </p>
        </header>

        <ul className="grid list-none gap-5 p-0 sm:grid-cols-2 sm:gap-6 xl:grid-cols-3 xl:gap-7">
          {BLOG_POSTS.map((post) => (
            <li key={post.href} className="p-0">
              <article
                className={cn(
                  'group flex h-full flex-col overflow-hidden rounded-[22px] border-2 transition-[transform,box-shadow] duration-200 lg:rounded-3xl',
                  'hover:-translate-y-1 hover:shadow-xl',
                )}
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
                  boxShadow: 'var(--card-shadow), 0 0 48px color-mix(in srgb, var(--accent-primary) 8%, transparent)',
                }}
              >
                <div
                  className="border-b px-5 py-4 sm:px-6 sm:py-5"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'linear-gradient(90deg, color-mix(in srgb, var(--accent-primary) 12%, transparent), transparent)',
                  }}
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]" style={{ color: 'var(--text-muted)' }}>
                    {post.category}
                  </p>
                  <h2 className="mt-2 text-lg font-bold leading-snug tracking-tight sm:text-xl">{post.title}</h2>
                </div>
                <div className="flex flex-1 flex-col px-5 py-5 sm:px-6 sm:py-6">
                  <p className="flex-1 text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                    {post.description}
                  </p>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t pt-5 sm:mt-8 sm:pt-6" style={{ borderColor: 'var(--card-border)' }}>
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium sm:text-sm" style={{ color: 'var(--text-muted)' }}>
                      <Clock className="size-3.5 shrink-0" aria-hidden />
                      {post.readTime}
                    </span>
                    <Link
                      href={post.href}
                      className="landing-cta-lift inline-flex h-10 items-center justify-center gap-2 rounded-[12px] px-5 text-sm font-semibold text-white sm:h-11 sm:px-6"
                      style={{
                        background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
                        boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 28%, transparent)',
                      }}
                    >
                      Read article
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </div>
                </div>
              </article>
            </li>
          ))}
        </ul>
      </div>
    </BlogMarketingShell>
  );
}
