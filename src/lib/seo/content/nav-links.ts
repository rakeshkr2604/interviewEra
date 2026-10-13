/**
 * Static nav/footer href lists. Keep this file free of the programmatic
 * question bank (`registry` → `questions.ts`) so client chrome can import
 * it without pulling ~500 KB of SEO copy into every authenticated route.
 */

import type { SeoTextLink } from '@/lib/seo/internal-links';

export type NavResourceItem = {
  label: string;
  href: string;
  desc: string;
};

export const NAV_CAMPUS_ITEMS: readonly NavResourceItem[] = [
  {
    label: 'Campus Placements Overview',
    href: '/campus',
    desc: 'Structured mock interviews, pilot pricing, and cohort analytics for T&P teams',
  },
  {
    label: 'Set up Campus Workspace',
    href: '/signup?intent=college',
    desc: 'Create your campus dashboard and invite your batch',
  },
  {
    label: 'Student Invitation Help',
    href: '/help-center',
    desc: 'How to accept a campus invite and start practising',
  },
] as const;

export const NAV_TOOLS_LINKS: readonly SeoTextLink[] = [
  { href: '/tools/question-generator', label: 'Interview Question Generator' },
  { href: '/tools/ats-checker', label: 'ATS Resume Checker' },
  { href: '/tools/star-builder', label: 'STAR Answer Builder' },
] as const;

export const NAV_TOOLS_ITEMS: readonly NavResourceItem[] = [
  {
    label: 'Interview Question Generator',
    href: '/tools/question-generator',
    desc: 'Role-specific questions in seconds',
  },
  {
    label: 'ATS Resume Checker',
    href: '/tools/ats-checker',
    desc: 'Score your resume against job roles',
  },
  {
    label: 'STAR Answer Builder',
    href: '/tools/star-builder',
    desc: 'Structure behavioral answers clearly',
  },
] as const;

export const NAV_RESOURCE_ITEMS: readonly NavResourceItem[] = [
  { label: 'All Resources', href: '/resources', desc: 'Central guide and hub directory' },
  { label: 'Blog', href: '/blog', desc: 'Interview prep articles and guides' },
  {
    label: 'Agentic AI Interview Guide',
    href: '/blog/agentic-ai-interview-round-2026',
    desc: 'AI-assisted coding interviews, rubrics, and prep roadmaps',
  },
  {
    label: 'Placement Guide',
    href: '/blog/how-to-prepare-for-placement-interviews',
    desc: 'Step-by-step campus prep playbook',
  },
  {
    label: 'STAR Method Guide',
    href: '/blog/what-is-star-method-with-examples',
    desc: 'Master behavioral answers',
  },
  {
    label: 'DSA Topic Map',
    href: '/blog/top-dsa-interview-questions',
    desc: 'Patterns, roadmap, and top 50 problems',
  },
  {
    label: 'Software Engineer Guide',
    href: '/interview-questions/software-engineer',
    desc: 'SWE questions and prep hub',
  },
  {
    label: 'Android Guide',
    href: '/interview-questions/android-developer',
    desc: 'Kotlin, Compose, MVVM prep hub',
  },
  {
    label: 'Frontend Guide',
    href: '/interview-questions/frontend-developer',
    desc: 'React and JavaScript interviews',
  },
  { label: 'Help Center', href: '/help-center', desc: 'Guides, FAQs, and support' },
] as const;

export const FOOTER_INTERVIEW_QUESTIONS_LINKS: readonly SeoTextLink[] = [
  { href: '/interview-questions/companies/wipro', label: 'Wipro Careers Hub' },
  { href: '/interview-questions/solera', label: 'Solera Careers Hub' },
  {
    href: '/interview-questions/companies/amazon/software-engineer',
    label: 'Amazon SDE Questions',
  },
  {
    href: '/interview-questions/companies/microsoft/software-engineer',
    label: 'Microsoft SDE Questions',
  },
  {
    href: '/interview-questions/companies/infosys/software-engineer',
    label: 'Infosys SWE Questions',
  },
  {
    href: '/interview-questions/companies/infosys/java-developer',
    label: 'Infosys Java Questions',
  },
  {
    href: '/interview-questions/companies/freshworks/frontend-developer',
    label: 'Freshworks Frontend Questions',
  },
  { href: '/interview-questions/android-developer', label: 'Android Developer Questions' },
  { href: '/interview-questions/frontend-developer', label: 'Frontend Developer Questions' },
  { href: '/interview-questions/java-developer', label: 'Java Developer Questions' },
] as const;

export const FOOTER_RESOURCES_LINKS: readonly SeoTextLink[] = [
  { href: '/community', label: 'Community Hub' },
  { href: '/resources', label: 'All Resources' },
  { href: '/blog', label: 'Blog' },
  { href: '/blog/agentic-ai-interview-round-2026', label: 'Agentic AI Interview Guide' },
  { href: '/blog/what-is-agentic-ai', label: 'What Is Agentic AI' },
  { href: '/blog/agentic-coding-round', label: 'Agentic Coding Round' },
  { href: '/blog/ai-prompt-engineering-interview', label: 'AI Prompt Engineering' },
  { href: '/blog/cursor-ai-interview-guide', label: 'Cursor AI Interview Guide' },
  { href: '/blog/top-dsa-interview-questions', label: 'DSA Topic Map' },
  { href: '/blog/how-to-prepare-for-placement-interviews', label: 'Placement Guide' },
  { href: '/blog/what-is-star-method-with-examples', label: 'STAR Guide' },
  { href: '/blog/hr-interview-answer-tips-and-tricks', label: 'HR Guide' },
  { href: '/blog/overcome-interview-anxiety-mock-interviews', label: 'Interview Tips' },
] as const;

export function resolveNavResource(path: string): NavResourceItem | undefined {
  return NAV_RESOURCE_ITEMS.find((item) => item.href === path);
}
