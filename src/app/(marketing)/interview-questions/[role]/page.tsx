import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import Image from 'next/image'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { RelatedGuidesSection } from '@/components/content/RelatedGuidesSection'
import { BaCompanyProcessSection } from '@/components/programmatic/BaCompanyProcessSection'
import { BaTableOfContents } from '@/components/programmatic/BaTableOfContents'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import { AndroidDeveloperHubArticle } from '@/components/programmatic/AndroidDeveloperHubArticle'
import { SoftwareEngineerHubArticle } from '@/components/programmatic/SoftwareEngineerHubArticle'
import { FrontendDeveloperHubArticle } from '@/components/programmatic/FrontendDeveloperHubArticle'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import {
  getRoleBySlug,
  allRoleParams,
  questionsHubPath,
  qgDeepLinkPath,
} from '@/lib/seo/programmatic'
import {
  rolePageMetadata,
  roleBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getRoleQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildRolePageLinks, buildRoleSkillLinks } from '@/lib/seo/internal-linking'
import {
  ANDROID_AUTHOR_NAME,
  ANDROID_CANONICAL_PATH,
  ANDROID_DESCRIPTION,
  ANDROID_DEVELOPER_QUESTIONS,
  ANDROID_FAQ_ITEMS,
  ANDROID_HERO_ALT,
  ANDROID_HERO_HEIGHT,
  ANDROID_HERO_PATH,
  ANDROID_HERO_WIDTH,
  ANDROID_LAST_UPDATED,
  ANDROID_META_TITLE,
  ANDROID_PROCESS_ALT,
  ANDROID_PROCESS_HEIGHT,
  ANDROID_PROCESS_PATH,
  ANDROID_PROCESS_WIDTH,
  ANDROID_PUBLISHED_DATE,
  ANDROID_REVIEWED_DATE,
  ANDROID_REVIEWER_NAME,
  ANDROID_ROADMAP_ALT,
  ANDROID_ROADMAP_HEIGHT,
  ANDROID_ROADMAP_PATH,
  ANDROID_ROADMAP_WIDTH,
  ANDROID_MVVM_ARCHITECTURE_ALT,
  ANDROID_MVVM_ARCHITECTURE_HEIGHT,
  ANDROID_MVVM_ARCHITECTURE_PATH,
  ANDROID_MVVM_ARCHITECTURE_WIDTH,
  isAndroidDeveloperHub,
} from '@/lib/seo/programmatic/android-developer-hub'
import {
  SOFTWARE_ENGINEER_AUTHOR_NAME,
  SOFTWARE_ENGINEER_CANONICAL_PATH,
  SOFTWARE_ENGINEER_DESCRIPTION,
  SOFTWARE_ENGINEER_FAQ_ITEMS,
  SOFTWARE_ENGINEER_HERO_ALT,
  SOFTWARE_ENGINEER_HERO_HEIGHT,
  SOFTWARE_ENGINEER_HERO_PATH,
  SOFTWARE_ENGINEER_HERO_WIDTH,
  SOFTWARE_ENGINEER_LAST_UPDATED,
  SOFTWARE_ENGINEER_META_TITLE,
  SOFTWARE_ENGINEER_PROCESS_ALT,
  SOFTWARE_ENGINEER_PROCESS_HEIGHT,
  SOFTWARE_ENGINEER_PROCESS_PATH,
  SOFTWARE_ENGINEER_PROCESS_WIDTH,
  SOFTWARE_ENGINEER_PUBLISHED_DATE,
  SOFTWARE_ENGINEER_REVIEWED_DATE,
  SOFTWARE_ENGINEER_REVIEWER_NAME,
  SOFTWARE_ENGINEER_ROADMAP_ALT,
  SOFTWARE_ENGINEER_ROADMAP_HEIGHT,
  SOFTWARE_ENGINEER_ROADMAP_PATH,
  SOFTWARE_ENGINEER_ROADMAP_WIDTH,
  isSoftwareEngineerHub,
} from '@/lib/seo/programmatic/software-engineer-hub'
import {
  FRONTEND_AUTHOR_NAME,
  FRONTEND_CANONICAL_PATH,
  FRONTEND_DESCRIPTION,
  FRONTEND_FAQ_ITEMS,
  FRONTEND_HERO_ALT,
  FRONTEND_HERO_HEIGHT,
  FRONTEND_HERO_PATH,
  FRONTEND_HERO_WIDTH,
  FRONTEND_LAST_UPDATED,
  FRONTEND_META_TITLE,
  FRONTEND_PROCESS_ALT,
  FRONTEND_PROCESS_HEIGHT,
  FRONTEND_PROCESS_PATH,
  FRONTEND_PROCESS_WIDTH,
  FRONTEND_PUBLISHED_DATE,
  FRONTEND_REVIEWED_DATE,
  FRONTEND_REVIEWER_NAME,
  FRONTEND_ROADMAP_ALT,
  FRONTEND_ROADMAP_HEIGHT,
  FRONTEND_ROADMAP_PATH,
  FRONTEND_ROADMAP_WIDTH,
  isFrontendDeveloperHub,
} from '@/lib/seo/programmatic/frontend-developer-hub'
import '../../blog/blog.css'

export function generateStaticParams() {
  return allRoleParams()
}

/** Unknown slugs must 404 at the router — not soft-404 via streamed notFound() under (marketing)/loading.tsx. */
export const dynamicParams = false

type Props = { params: Promise<{ role: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) return {}
  if (role.slug === 'business-analyst') {
    const title = 'Business Analyst Interview Questions (2026)'
    const description =
      'Business Analyst interview questions with expert answers for India 2026: BA workflow, SQL, stakeholder scenarios, salary, resume mistakes, and a 90-day plan.'
    return baseGenerateMetadata({
      title,
      description,
      path: `/interview-questions/${role.slug}`,
      keywords: [
        'business analyst interview questions',
        'business analyst interview questions with answers',
        'ba interview questions India 2026',
        'business analyst salary India 2026',
        'requirements gathering interview questions',
        'SQL for business analyst interview',
        'stakeholder management interview questions',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }
  if (isAndroidDeveloperHub(role.slug)) {
    return baseGenerateMetadata({
      title: ANDROID_META_TITLE,
      description: ANDROID_DESCRIPTION,
      path: ANDROID_CANONICAL_PATH,
      ogImage: `${getCanonicalSiteOrigin()}${ANDROID_HERO_PATH}`,
      keywords: [
        'Android developer interview questions',
        'Android developer interview questions and answers',
        'Android interview questions 2026',
        'Android interview questions and answers',
        'Kotlin Android interview questions',
        'Jetpack Compose interview questions',
        'MVVM Android interview',
        'Android coroutines interview',
        'Android system design interview',
        'Android hiring process India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }
  if (isSoftwareEngineerHub(role.slug)) {
    return baseGenerateMetadata({
      title: SOFTWARE_ENGINEER_META_TITLE,
      description: SOFTWARE_ENGINEER_DESCRIPTION,
      path: SOFTWARE_ENGINEER_CANONICAL_PATH,
      ogImage: `${getCanonicalSiteOrigin()}${SOFTWARE_ENGINEER_HERO_PATH}`,
      keywords: [
        'software engineer interview questions',
        'software engineer interview questions India 2026',
        'software engineer interview questions and answers',
        'SWE interview preparation India',
        'DSA interview questions software engineer',
        'system design interview software engineer',
        'campus placement software engineer questions',
        'OOPs interview questions',
        'software engineer hiring process India',
        'software engineer mock interview',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }
  if (isFrontendDeveloperHub(role.slug)) {
    return baseGenerateMetadata({
      title: FRONTEND_META_TITLE,
      description: FRONTEND_DESCRIPTION,
      path: FRONTEND_CANONICAL_PATH,
      ogImage: `${getCanonicalSiteOrigin()}${FRONTEND_HERO_PATH}`,
      keywords: [
        'frontend developer interview questions',
        'frontend developer interview questions India 2026',
        'frontend developer interview questions and answers',
        'React interview questions frontend',
        'JavaScript interview questions',
        'CSS interview questions',
        'TypeScript frontend interview',
        'frontend hiring process India',
        'frontend developer mock interview',
        'React vs Angular interview',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }
  return rolePageMetadata(role)
}

const ORIGIN = getCanonicalSiteOrigin()
const BA_HERO_PATH = '/blog/business-analyst-hero.webp'
const BA_HERO_ALT = 'Business Analyst Interview Questions with Expert Answers and Real-world Scenarios'
const BA_HERO_WIDTH = 1774
const BA_HERO_HEIGHT = 887
const BA_WORKFLOW_PATH = '/blog/business-analyst-workflow.webp'
const BA_WORKFLOW_ALT = 'Business Analyst workflow: stakeholder meeting, requirement gathering, BRD documentation, analysis, development support, UAT, and release'
const BA_WORKFLOW_WIDTH = 1881
const BA_WORKFLOW_HEIGHT = 836
const BA_READING_TIME = '18 min read'
const BA_PUBLISHED_DATE = '2026-05-31'
const BA_LAST_UPDATED = '2026-06-05'
const BA_REVIEWED_DATE = '2026-06-05'
const BA_AUTHOR_NAME = 'InterviewEra Team'
const BA_REVIEWER_NAME = 'InterviewEra Editorial'
const BA_CANONICAL_PATH = '/interview-questions/business-analyst'
const BA_PROSE_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-blog-prose--editorial-series ie-role-ba-shell mx-auto w-full px-4 sm:px-5 pb-8 md:pb-12'
const BA_CONTENT_CLASS = 'ie-blog-interview-anxiety-content'
const BA_SHELL_CLASS = 'ie-blog-prose ie-blog-prose--interview-anxiety ie-role-ba-shell mx-auto w-full px-4 sm:px-5'

const BA_FAQ_ITEMS = [
  {
    question: 'How many interview questions should a Business Analyst prepare?',
    answer:
      'Aim for 40–60 core questions across requirements, process modelling, SQL, stakeholder management, and product thinking. What matters is not memorizing—practice explaining your approach and trade-offs using one real project end-to-end.',
  },
  {
    question: 'Do Business Analyst interviews in India require SQL?',
    answer:
      'For analytics-heavy BA roles, yes. You are usually tested on joins, grouping, filtering, and basic window functions. Even when SQL is not the primary skill, it signals you can validate metrics and investigate issues without waiting for an analyst.',
  },
  {
    question: 'What is the fastest way to improve requirement gathering skills?',
    answer:
      'Stop asking for “features” and start eliciting decisions: user goal, success metric, constraints, and edge cases. Use a structured script: context → current workflow → pain points → desired outcome → acceptance criteria → non-functional requirements.',
  },
  {
    question: 'How do I answer “Tell me about yourself” as a BA fresher?',
    answer:
      'Use a BA-specific narrative: your domain interest, one project where you gathered requirements or analyzed data, the impact (even if small), and the BA tools you used. Close by mapping your strengths to the role’s day-to-day responsibilities.',
  },
] as const

const BA_TOC_SECTIONS = [
  { id: 'ba-what-does', label: 'What Does a Business Analyst Do?' },
  { id: 'ba-responsibilities', label: 'Business Analyst Roles and Responsibilities' },
  { id: 'ba-skills-2026', label: 'Skills Required for Business Analysts' },
  { id: 'ba-workflow', label: 'Business Analyst Workflow' },
  { id: 'ba-process-india', label: 'Business Analyst Interview Process' },
  { id: 'ba-salary', label: 'Salary Guide' },
  { id: 'ba-tools', label: 'Tools and Software' },
  { id: 'ba-certifications', label: 'Certifications' },
  { id: 'ba-resume-mistakes', label: 'Resume Mistakes' },
  { id: 'ba-questions', label: 'Interview Questions and Answers' },
  { id: 'ba-faq', label: 'FAQs' },
] as const

export default async function RoleQuestionsPage({ params }: Props) {
  const { role: roleSlug } = await params
  const role = getRoleBySlug(roleSlug)
  if (!role) notFound()

  const isAndroidHub = isAndroidDeveloperHub(role.slug)
  const isSweHub = isSoftwareEngineerHub(role.slug)
  const isFeHub = isFrontendDeveloperHub(role.slug)
  const isEditorialHub = role.slug === 'business-analyst' || isAndroidHub || isSweHub || isFeHub

  const questions = getRoleQuestionsFlat(role.slug)
  const hubQuestions = isAndroidHub ? ANDROID_DEVELOPER_QUESTIONS : questions
  const faqPairs = buildFaqPairs(questions)

  const skillLinks = buildRoleSkillLinks(role)
  const linkSections = buildRolePageLinks(role)

  const BREADCRUMB_LD = breadcrumbListJsonLd(roleBreadcrumbs(role), ORIGIN)
  const FAQ_LD =
    role.slug === 'business-analyst'
      ? faqPageJsonLd([...BA_FAQ_ITEMS])
      : isAndroidHub
        ? faqPageJsonLd([...ANDROID_FAQ_ITEMS])
        : isSweHub
          ? faqPageJsonLd([...SOFTWARE_ENGINEER_FAQ_ITEMS])
          : isFeHub
            ? faqPageJsonLd([...FRONTEND_FAQ_ITEMS])
            : faqPairs.length > 0
          ? faqPageJsonLd(faqPairs)
          : null

  const itemListPageUrl = canonicalUrl(`/interview-questions/${role.slug}`)
  const ITEM_LIST_LD =
    isEditorialHub && hubQuestions.length > 0 && itemListPageUrl
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          name: `${role.label} interview questions`,
          url: itemListPageUrl,
          numberOfItems: hubQuestions.length,
          itemListElement: hubQuestions.map((q, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: q.question,
          })),
        }
      : null

  const baPageUrl = role.slug === 'business-analyst' ? canonicalUrl(BA_CANONICAL_PATH) : null
  const BA_PAGE_LD = baPageUrl
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${ORIGIN}#website`,
            url: ORIGIN,
            name: 'InterviewEra',
            publisher: { '@id': schemaIds.organization },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Organization',
            '@id': schemaIds.organization,
            name: 'InterviewEra',
            url: ORIGIN,
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#ba-author`,
            name: BA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#ba-reviewer`,
            name: BA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${BA_HERO_PATH}#image`,
            url: `${ORIGIN}${BA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${BA_HERO_PATH}`,
            caption: BA_HERO_ALT,
            width: BA_HERO_WIDTH,
            height: BA_HERO_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': baPageUrl,
            url: baPageUrl,
            name:
              'Business Analyst Interview Questions and Answers for Freshers & Experienced (2026)',
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${BA_HERO_PATH}#image` },
            mainEntity: { '@id': `${baPageUrl}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${baPageUrl}#article`,
            headline:
              'Business Analyst Interview Questions and Answers for Freshers & Experienced (2026)',
            description:
              'Business Analyst interview questions with expert answers for India 2026: BA workflow, SQL, stakeholder scenarios, salary, resume mistakes, and a 90-day plan.',
            mainEntityOfPage: { '@id': baPageUrl },
            url: baPageUrl,
            datePublished: BA_PUBLISHED_DATE,
            dateModified: BA_LAST_UPDATED,
            dateReviewed: BA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#ba-author` },
            reviewedBy: { '@id': `${ORIGIN}#ba-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${BA_HERO_PATH}#image` },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1', '#ba-what-does', '#ba-questions'],
            },
          },
        ],
      }
    : null

  const androidPageUrl = isAndroidHub ? canonicalUrl(ANDROID_CANONICAL_PATH) : null
  const ANDROID_PAGE_LD = androidPageUrl
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${ORIGIN}#website`,
            url: ORIGIN,
            name: 'InterviewEra',
            publisher: { '@id': schemaIds.organization },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Organization',
            '@id': schemaIds.organization,
            name: 'InterviewEra',
            url: ORIGIN,
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#android-author`,
            name: ANDROID_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#android-reviewer`,
            name: ANDROID_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${ANDROID_HERO_PATH}#image`,
            url: `${ORIGIN}${ANDROID_HERO_PATH}`,
            contentUrl: `${ORIGIN}${ANDROID_HERO_PATH}`,
            caption: ANDROID_HERO_ALT,
            width: ANDROID_HERO_WIDTH,
            height: ANDROID_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${ANDROID_PROCESS_PATH}#image`,
            url: `${ORIGIN}${ANDROID_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${ANDROID_PROCESS_PATH}`,
            caption: ANDROID_PROCESS_ALT,
            width: ANDROID_PROCESS_WIDTH,
            height: ANDROID_PROCESS_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${ANDROID_ROADMAP_PATH}#image`,
            url: `${ORIGIN}${ANDROID_ROADMAP_PATH}`,
            contentUrl: `${ORIGIN}${ANDROID_ROADMAP_PATH}`,
            caption: ANDROID_ROADMAP_ALT,
            width: ANDROID_ROADMAP_WIDTH,
            height: ANDROID_ROADMAP_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${ANDROID_MVVM_ARCHITECTURE_PATH}#image`,
            url: `${ORIGIN}${ANDROID_MVVM_ARCHITECTURE_PATH}`,
            contentUrl: `${ORIGIN}${ANDROID_MVVM_ARCHITECTURE_PATH}`,
            caption: ANDROID_MVVM_ARCHITECTURE_ALT,
            width: ANDROID_MVVM_ARCHITECTURE_WIDTH,
            height: ANDROID_MVVM_ARCHITECTURE_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': androidPageUrl,
            url: androidPageUrl,
            name: ANDROID_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${ANDROID_HERO_PATH}#image` },
            mainEntity: { '@id': `${androidPageUrl}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${androidPageUrl}#article`,
            headline: ANDROID_META_TITLE,
            description: ANDROID_DESCRIPTION,
            mainEntityOfPage: { '@id': androidPageUrl },
            url: androidPageUrl,
            datePublished: ANDROID_PUBLISHED_DATE,
            dateModified: ANDROID_LAST_UPDATED,
            dateReviewed: ANDROID_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#android-author` },
            reviewedBy: { '@id': `${ORIGIN}#android-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: [
              { '@id': `${ORIGIN}${ANDROID_HERO_PATH}#image` },
              { '@id': `${ORIGIN}${ANDROID_PROCESS_PATH}#image` },
              { '@id': `${ORIGIN}${ANDROID_ROADMAP_PATH}#image` },
              { '@id': `${ORIGIN}${ANDROID_MVVM_ARCHITECTURE_PATH}#image` },
            ],
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1', '#android-hiring-process', '#android-architecture-flow', '#android-questions'],
            },
          },
        ],
      }
    : null

  const swePageUrl = isSweHub ? canonicalUrl(SOFTWARE_ENGINEER_CANONICAL_PATH) : null
  const SWE_PAGE_LD = swePageUrl
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${ORIGIN}#website`,
            url: ORIGIN,
            name: 'InterviewEra',
            publisher: { '@id': schemaIds.organization },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Organization',
            '@id': schemaIds.organization,
            name: 'InterviewEra',
            url: ORIGIN,
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#swe-author`,
            name: SOFTWARE_ENGINEER_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#swe-reviewer`,
            name: SOFTWARE_ENGINEER_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${SOFTWARE_ENGINEER_HERO_PATH}#image`,
            url: `${ORIGIN}${SOFTWARE_ENGINEER_HERO_PATH}`,
            contentUrl: `${ORIGIN}${SOFTWARE_ENGINEER_HERO_PATH}`,
            caption: SOFTWARE_ENGINEER_HERO_ALT,
            width: SOFTWARE_ENGINEER_HERO_WIDTH,
            height: SOFTWARE_ENGINEER_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${SOFTWARE_ENGINEER_PROCESS_PATH}#image`,
            url: `${ORIGIN}${SOFTWARE_ENGINEER_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${SOFTWARE_ENGINEER_PROCESS_PATH}`,
            caption: SOFTWARE_ENGINEER_PROCESS_ALT,
            width: SOFTWARE_ENGINEER_PROCESS_WIDTH,
            height: SOFTWARE_ENGINEER_PROCESS_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${SOFTWARE_ENGINEER_ROADMAP_PATH}#image`,
            url: `${ORIGIN}${SOFTWARE_ENGINEER_ROADMAP_PATH}`,
            contentUrl: `${ORIGIN}${SOFTWARE_ENGINEER_ROADMAP_PATH}`,
            caption: SOFTWARE_ENGINEER_ROADMAP_ALT,
            width: SOFTWARE_ENGINEER_ROADMAP_WIDTH,
            height: SOFTWARE_ENGINEER_ROADMAP_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': swePageUrl,
            url: swePageUrl,
            name: SOFTWARE_ENGINEER_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${SOFTWARE_ENGINEER_HERO_PATH}#image` },
            mainEntity: { '@id': `${swePageUrl}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${swePageUrl}#article`,
            headline: SOFTWARE_ENGINEER_META_TITLE,
            description: SOFTWARE_ENGINEER_DESCRIPTION,
            mainEntityOfPage: { '@id': swePageUrl },
            url: swePageUrl,
            datePublished: SOFTWARE_ENGINEER_PUBLISHED_DATE,
            dateModified: SOFTWARE_ENGINEER_LAST_UPDATED,
            dateReviewed: SOFTWARE_ENGINEER_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#swe-author` },
            reviewedBy: { '@id': `${ORIGIN}#swe-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: [
              { '@id': `${ORIGIN}${SOFTWARE_ENGINEER_HERO_PATH}#image` },
              { '@id': `${ORIGIN}${SOFTWARE_ENGINEER_PROCESS_PATH}#image` },
              { '@id': `${ORIGIN}${SOFTWARE_ENGINEER_ROADMAP_PATH}#image` },
            ],
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1', '#swe-hiring-process', '#swe-topic-importance', '#swe-questions'],
            },
          },
        ],
      }
    : null

  const fePageUrl = isFeHub ? canonicalUrl(FRONTEND_CANONICAL_PATH) : null
  const FE_PAGE_LD = fePageUrl
    ? {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${ORIGIN}#website`,
            url: ORIGIN,
            name: 'InterviewEra',
            publisher: { '@id': schemaIds.organization },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Organization',
            '@id': schemaIds.organization,
            name: 'InterviewEra',
            url: ORIGIN,
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#fe-author`,
            name: FRONTEND_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#fe-reviewer`,
            name: FRONTEND_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${FRONTEND_HERO_PATH}#image`,
            url: `${ORIGIN}${FRONTEND_HERO_PATH}`,
            contentUrl: `${ORIGIN}${FRONTEND_HERO_PATH}`,
            caption: FRONTEND_HERO_ALT,
            width: FRONTEND_HERO_WIDTH,
            height: FRONTEND_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${FRONTEND_PROCESS_PATH}#image`,
            url: `${ORIGIN}${FRONTEND_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${FRONTEND_PROCESS_PATH}`,
            caption: FRONTEND_PROCESS_ALT,
            width: FRONTEND_PROCESS_WIDTH,
            height: FRONTEND_PROCESS_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${FRONTEND_ROADMAP_PATH}#image`,
            url: `${ORIGIN}${FRONTEND_ROADMAP_PATH}`,
            contentUrl: `${ORIGIN}${FRONTEND_ROADMAP_PATH}`,
            caption: FRONTEND_ROADMAP_ALT,
            width: FRONTEND_ROADMAP_WIDTH,
            height: FRONTEND_ROADMAP_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': fePageUrl,
            url: fePageUrl,
            name: FRONTEND_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${FRONTEND_HERO_PATH}#image` },
            mainEntity: { '@id': `${fePageUrl}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${fePageUrl}#article`,
            headline: FRONTEND_META_TITLE,
            description: FRONTEND_DESCRIPTION,
            mainEntityOfPage: { '@id': fePageUrl },
            url: fePageUrl,
            datePublished: FRONTEND_PUBLISHED_DATE,
            dateModified: FRONTEND_LAST_UPDATED,
            dateReviewed: FRONTEND_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#fe-author` },
            reviewedBy: { '@id': `${ORIGIN}#fe-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: [
              { '@id': `${ORIGIN}${FRONTEND_HERO_PATH}#image` },
              { '@id': `${ORIGIN}${FRONTEND_PROCESS_PATH}#image` },
              { '@id': `${ORIGIN}${FRONTEND_ROADMAP_PATH}#image` },
            ],
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: ['h1', '#fe-hiring-process', '#fe-topic-importance', '#fe-questions'],
            },
          },
        ],
      }
    : null

  return (
    <>
      <JsonLdScript id="role-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="role-faq-ld" data={FAQ_LD} /> : null}
      {ITEM_LIST_LD ? <JsonLdScript id="role-question-itemlist-ld" data={ITEM_LIST_LD} /> : null}
      {BA_PAGE_LD ? <JsonLdScript id="role-ba-page-ld" data={BA_PAGE_LD} /> : null}
      {ANDROID_PAGE_LD ? <JsonLdScript id="role-android-page-ld" data={ANDROID_PAGE_LD} /> : null}
      {SWE_PAGE_LD ? <JsonLdScript id="role-swe-page-ld" data={SWE_PAGE_LD} /> : null}
      {FE_PAGE_LD ? <JsonLdScript id="role-fe-page-ld" data={FE_PAGE_LD} /> : null}

      {/* ── Hero (non-editorial roles) ───────────────────────────────────── */}
      {!isEditorialHub ? (
        <section
          className={`${CONTENT_SECTION} border-b`}
          style={{ borderColor: 'var(--card-border)' }}
        >
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
              <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                Interview Questions
              </Link>
              <span aria-hidden className="mx-1.5">›</span>
              <span>{role.label}</span>
            </nav>

            <p
              className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
              style={{ color: 'var(--accent-primary)' }}
            >
              {role.category} · {role.fresherFriendly ? 'Fresher-friendly' : 'Experienced'}
            </p>
            <h1
              className="mt-2 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl"
              style={{ color: 'var(--text-primary)' }}
            >
              {role.label} Interview Questions India 2026
            </h1>
            <p
              className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-base"
              style={{ color: 'var(--text-secondary)' }}
            >
              {role.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {role.fresherFriendly ? (
                <InfoBadge label="Fresher-friendly" color="#22c55e" />
              ) : null}
              <InfoBadge label={`${role.category} role`} color="var(--accent-primary)" />
              {questions.length > 0 ? (
                <InfoBadge label={`${questions.length} curated questions`} color="var(--accent-primary)" />
              ) : null}
              <InfoBadge label="Updated 2026" color="var(--text-muted)" />
            </div>
          </div>
        </section>
      ) : null}

      {role.slug === 'business-analyst' ? (
        <article className={BA_PROSE_CLASS}>
          <header className="ie-blog-editorial-header ie-role-ba-hero">
            <div className={BA_CONTENT_CLASS}>
              <nav className="mb-4 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
                <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                  Interview Questions
                </Link>
                <span aria-hidden className="mx-1.5">›</span>
                <span>{role.label}</span>
              </nav>

              <p
                className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm"
                style={{ color: 'var(--accent-primary)' }}
              >
                {role.category} · {role.fresherFriendly ? 'Fresher-friendly' : 'Experienced'}
              </p>
              <h1 className="ie-blog-article-h1">
                <span className="ie-blog-article-h1__line">{role.label} Interview Questions</span>
                <span className="ie-blog-article-h1__accent">India 2026</span>
              </h1>
              <p className="ie-blog-article-deck">{role.description}</p>
              <div className="ie-blog-article-meta ie-role-ba-hero-badges mt-5 flex flex-wrap gap-2">
                {role.fresherFriendly ? (
                  <InfoBadge label="Fresher-friendly" color="#22c55e" />
                ) : null}
                <InfoBadge label={`${role.category} role`} color="var(--accent-primary)" />
                {questions.length > 0 ? (
                  <InfoBadge label={`${questions.length} curated questions`} color="var(--accent-primary)" />
                ) : null}
                <InfoBadge label="Updated 2026" color="var(--text-muted)" />
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  · {BA_READING_TIME}
                </span>
              </div>
            </div>
            <div className="ie-role-ba-hero-image">
              <Image
                src={BA_HERO_PATH}
                alt={BA_HERO_ALT}
                width={BA_HERO_WIDTH}
                height={BA_HERO_HEIGHT}
                quality={95}
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
              />
            </div>
            <div className={`${BA_CONTENT_CLASS} ie-role-ba-toc-slot`}>
              <BaTableOfContents sections={BA_TOC_SECTIONS} />
            </div>
          </header>

          <div className={BA_CONTENT_CLASS}>
            <aside
              className="mt-6 rounded-xl border p-4"
              style={{
                borderColor: 'var(--card-border)',
                background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
              }}
              aria-label="Article metadata"
            >
              <p className="m-0 text-xs font-bold uppercase tracking-[0.14em]" style={{ color: 'var(--text-muted)' }}>
                About this guide
              </p>
              <dl className="mt-2 space-y-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <div className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Author:
                  </dt>
                  <dd className="m-0">{BA_AUTHOR_NAME}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Reviewed by:
                  </dt>
                  <dd className="m-0">{BA_REVIEWER_NAME}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Last updated:
                  </dt>
                  <dd className="m-0">{BA_LAST_UPDATED}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Reviewed:
                  </dt>
                  <dd className="m-0">{BA_REVIEWED_DATE}</dd>
                </div>
                <div className="flex flex-wrap gap-x-1">
                  <dt className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                    Reading time:
                  </dt>
                  <dd className="m-0">{BA_READING_TIME}</dd>
                </div>
              </dl>
              <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                Content reviewed and updated for current Business Analyst hiring trends and interview patterns.
              </p>
            </aside>

          {/* ── BA resource sections (index-worthy) ───────────────────────── */}
          <section aria-labelledby="ba-what-does">
              <h2
                id="ba-what-does"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                What Does a Business Analyst Do?
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                A Business Analyst (BA) translates business outcomes into clear, testable requirements—and then stays
                close to delivery so the result matches what stakeholders actually needed. In India, BA roles sit on a
                spectrum: some are closer to product and UX discovery, others are closer to operations and reporting.
                The constant is the work pattern: understand the problem, define the decision the business is trying to
                make, align stakeholders, and reduce ambiguity for engineering and QA.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                In practical terms, your week typically includes requirement workshops, data checks (often SQL), process
                mapping, user story grooming, and clarifying edge cases. A strong BA is not a “note taker”—they are an
                owner of clarity. If a requirement is vague, a BA turns it into an unambiguous acceptance criteria. If a
                metric is disputed, a BA traces it back to the data definition. If stakeholders disagree, a BA surfaces
                the trade-off and drives a decision.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                If your interviews include data checks, practice the fundamentals on{' '}
                <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  SQL interview questions
                </Link>
                . For delivery roles, also review{' '}
                <Link href="/interview-questions/topics/agile" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  Agile interview questions
                </Link>{' '}
                and how teams work in sprints.
              </p>
              <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  A real-world BA workflow example (refund approvals)
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Imagine a stakeholder says: “Refunds take too long. Fix it.” A BA does not jump to UI screens. They
                  first map the current flow: request → verification → manager approval → payment gateway → customer
                  notification. Then they quantify the pain: median turnaround time, where the queue builds up, and how
                  many refunds are blocked by missing information.
                </p>
                <ol className="mt-3 list-decimal pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <li>
                    <strong>Clarify outcome:</strong> “Reduce refund TAT from 48 hours to 12 hours for 90% of cases.”
                  </li>
                  <li>
                    <strong>Define constraints:</strong> approvals above ₹10k require a manager; every decision needs an audit trail.
                  </li>
                  <li>
                    <strong>Design acceptance criteria:</strong> statuses, error states, and what “approved” means in the payment gateway.
                  </li>
                  <li>
                    <strong>Validate with data:</strong> segment delays by category—verification delays vs approval delays vs gateway failures.
                  </li>
                  <li>
                    <strong>Ship in slices:</strong> Phase 1 adds status + audit + SLA tracking; Phase 2 adds automation and dashboards.
                  </li>
                </ol>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  This is the level of clarity interviewers want: a workflow, measurable success, constraints, and a
                  delivery plan. If you want to strengthen your SQL confidence for these discussions, practice on the{' '}
                  <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                    SQL interview questions topic page
                  </Link>
                  .
                </p>
              </section>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                When you want to pressure-test your communication and structure under time, do not only read answers.
                Practice a live round:{' '}
                <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  start a free mock interview on InterviewEra
                </Link>
                .
              </p>
          </section>

          <section aria-labelledby="ba-responsibilities">
              <h2
                id="ba-responsibilities"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Business Analyst Roles and Responsibilities
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                A simple way to describe BA responsibility is: reduce rework. Rework happens when the team builds the
                wrong thing, builds the right thing with the wrong rules, or ships something that cannot operate in the
                real business environment. Your artifacts—BRDs, flows, user stories, and metric definitions—exist to
                prevent those failures. Roles that sit closer to IT systems design—such as a{' '}
                <Link href="/interview-questions/system-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  System Analyst
                </Link>
                —share overlap here, but BAs typically own business outcome clarity rather than technical architecture.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: 'Requirement discovery and elicitation',
                    body:
                      'Run stakeholder interviews and workshops. Map the current workflow, capture pain points, and convert “requests” into decisions, constraints, and acceptance criteria.',
                  },
                  {
                    title: 'Documentation that engineering can ship',
                    body:
                      'Write BRDs/SRS/user stories that are testable: definitions, edge cases, error states, and non-functional requirements (latency, audit logs, access control).',
                  },
                  {
                    title: 'Process modelling and gap analysis',
                    body:
                      'Create as-is and to-be flows (swimlanes/BPMN). Identify bottlenecks, handoffs, and policy constraints. Recommend a feasible improvement path.',
                  },
                  {
                    title: 'Data validation and metric alignment',
                    body:
                      'Use SQL and dashboards to validate claims, define KPIs, and reconcile “the number” across teams. Align on definitions before building.',
                  },
                ].map((card) => (
                  <section
                    key={card.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {card.body}
                    </p>
                  </section>
                ))}
              </div>
              <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  The BA artifacts interviewers trust
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <li>
                    <strong>User story + acceptance criteria:</strong> clear, testable, and includes edge cases.
                  </li>
                  <li>
                    <strong>Decision log:</strong> what was decided, why, by whom, and when it will be revisited.
                  </li>
                  <li>
                    <strong>Process flow (as-is / to-be):</strong> shows handoffs, approvals, and exception paths.
                  </li>
                  <li>
                    <strong>Metric definition:</strong> one source of truth for KPI formulas and filters (prevents “dashboard arguments”).
                  </li>
                  <li>
                    <strong>Traceability:</strong> requirement → story → test case (critical for payments, compliance, and enterprise work).
                  </li>
                </ul>
              </section>
          </section>

          <section id="ba-workflow" aria-labelledby="ba-workflow-heading">
            <h2
              id="ba-workflow-heading"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              BA Workflow (End-to-end)
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Interviewers trust candidates who can explain the full delivery loop—not just “requirements.” Use this
              workflow to anchor your answers when asked about stakeholder management, documentation quality, UAT, and
              launch impact.
            </p>
            <figure className="mt-6">
              <div
                className="mx-auto w-full overflow-hidden rounded-[20px] border"
                style={{
                  borderColor: 'var(--card-border)',
                  maxWidth: '900px',
                  boxShadow: '0 14px 36px color-mix(in srgb, #000 12%, transparent)',
                }}
              >
                <Image
                  src={BA_WORKFLOW_PATH}
                  alt={BA_WORKFLOW_ALT}
                  width={BA_WORKFLOW_WIDTH}
                  height={BA_WORKFLOW_HEIGHT}
                  quality={95}
                  loading="lazy"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 90vw, 900px"
                  style={{ width: '100%', height: 'auto' }}
                />
              </div>
              <figcaption className="mt-3 text-center text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                A practical BA workflow — stakeholder meeting → requirements → BRD → analysis → dev support → UAT →
                release.
              </figcaption>
            </figure>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Tools commonly used across this workflow include{' '}
              <Link href="/interview-questions/topics/jira" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Jira interview questions
              </Link>{' '}
              for tracking, plus Confluence/Docs for BRDs, and SQL/dashboards for validation.
            </p>
          </section>

          <section aria-labelledby="ba-skills-2026">
              <h2
                id="ba-skills-2026"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Skills Required for Business Analysts in 2026
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Hiring managers in 2026 are less impressed by generic “communication” claims and more impressed by a BA
                who can show repeatable workflows. The highest-signal skills are the ones that reduce delivery risk.
                Delivery-heavy teams also expect comfort with{' '}
                <Link href="/interview-questions/topics/agile" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  Agile interview questions
                </Link>{' '}
                around ceremonies, backlog quality, and sprint support.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: 'Stakeholder communication (structured)',
                    points: [
                      'Turn opinions into testable acceptance criteria.',
                      'Write meeting outcomes as decisions + owners + dates.',
                      'Handle disagreement by framing trade-offs and proposing a default.',
                    ],
                  },
                  {
                    title: 'Requirement quality (what to ship, not just what to build)',
                    points: [
                      'Clear scope boundaries and non-goals.',
                      'Edge cases: permissions, failures, retries, data validation.',
                      'Non-functional requirements: performance, auditability, compliance.',
                    ],
                  },
                  {
                    title: 'SQL and data reasoning',
                    points: [
                      'Joins, grouping, HAVING vs WHERE, window basics.',
                      'Validate funnels and revenue drops through segmentation.',
                      'Define metrics so dashboards don’t lie.',
                    ],
                  },
                  {
                    title: 'Process modelling and systems thinking',
                    points: [
                      'Swimlanes/BPMN to expose handoffs and bottlenecks.',
                      'As-is → to-be mapping with measurable improvement goals.',
                      'Risk thinking: what breaks in production and how to detect it.',
                    ],
                  },
                ].map((block) => (
                  <section
                    key={block.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {block.title}
                    </h3>
                    <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {block.points.map((p) => (
                        <li key={p}>{p}</li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
          </section>

          <section aria-labelledby="ba-process-india">
              <h2
                id="ba-process-india"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Business Analyst Interview Process in India
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Most Indian BA interview loops are a mix of requirement reasoning, communication, and basic data skills.
                You might see 2–4 rounds depending on whether the role is closer to product, operations, or analytics.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                One detail that differentiates strong candidates: they speak in a structured story, not a ramble. For
                behavioral rounds, use a clean narrative (Situation → Task → Action → Result). If you want a quick
                refresher with examples, read{' '}
                <Link href="/blog/what-is-star-method-with-examples" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  our STAR method guide
                </Link>
                .
              </p>
              <div className="mt-4 space-y-4">
                {[
                  {
                    title: 'Round 1 — Screening (HR + basics)',
                    body:
                      'You will be assessed on clarity, role fit, and how you explain past work. For freshers, interviewers use your project to test requirement thinking.',
                  },
                  {
                    title: 'Round 2 — Requirements / case study',
                    body:
                      'Typical prompts: “Design a feature”, “Write user stories”, “Create acceptance criteria”, or “Map the current process and propose improvements.” You are graded on structure and edge cases.',
                  },
                  {
                    title: 'Round 3 — Data / SQL / metrics',
                    body:
                      'Expect joins and aggregation, plus reasoning about funnels, revenue drops, or operational KPIs. Even a short SQL round reveals whether you can validate assumptions independently.',
                  },
                  {
                    title: 'Round 4 — Stakeholder and conflict scenarios',
                    body:
                      'Situations like competing priorities, last-minute changes, and disagreement between business and engineering. Strong answers show alignment, written decisions, and impact analysis.',
                  },
                ].map((step) => (
                  <section
                    key={step.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step.body}
                    </p>
                  </section>
                ))}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Round 1 often includes HR screening. Prepare concise, role-aligned answers with our{' '}
                <Link href="/blog/hr-interview-answer-tips-and-tricks" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  HR interview questions guide
                </Link>
                .
              </p>
              <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  What interviewers are actually grading
                </h3>
                <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  <li>
                    <strong>Clarity:</strong> can you define the problem and success metric in one minute?
                  </li>
                  <li>
                    <strong>Edge cases:</strong> permissions, failures, retries, and operational workflows.
                  </li>
                  <li>
                    <strong>Trade-offs:</strong> what you would ship now vs later and why.
                  </li>
                  <li>
                    <strong>Collaboration:</strong> how you align business + engineering without escalating every disagreement.
                  </li>
                </ul>
              </section>
          </section>

          <section aria-labelledby="ba-tools">
              <h2
                id="ba-tools"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Business Analyst Tools and Software
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Tools do not make someone a BA, but they reveal your delivery maturity. Interviewers like candidates who
                can explain why a tool was used and what artifact it produced.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                A useful framing in interviews is “tool → artifact → decision.” For example: Confluence → BRD → sign-off
                on scope; Lucidchart → swimlane → discover the bottleneck; SQL → segmented query → prove where the drop
                came from. This sounds simple, but it instantly moves you from “I used Jira” to “I shipped outcomes.”
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: 'Documentation and collaboration',
                    body:
                      'Confluence / Notion for specs and decisions. Google Docs for reviewable BRDs. The key is versioning: decisions should not live only in chat.',
                  },
                  {
                    title: 'Backlog and delivery tracking',
                    body:
                      'Jira / Azure DevOps for user stories, acceptance criteria, and sprint planning. A BA’s credibility improves when the backlog is clean and testable.',
                  },
                  {
                    title: 'Process and UX modelling',
                    body:
                      'Lucidchart, draw.io, Visio, or Miro for swimlanes/BPMN. Lightweight prototypes in Figma help stakeholders react to a concrete flow instead of arguing abstractly.',
                  },
                  {
                    title: 'Analytics and SQL',
                    body:
                      'SQL (Postgres/MySQL), Excel/Sheets, and dashboards like Power BI/Tableau. Know how to pull “one truth” for a metric before a review meeting.',
                  },
                ].map((card) => (
                  <section
                    key={card.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {card.body}
                    </p>
                  </section>
                ))}
              </div>
              <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  A practical SQL habit that makes you a stronger BA
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Whenever you present a metric, also know how you would validate it. Even a basic “repeat customers”
                  query teaches the right thinking: define the entity, define the time window, filter cancelled/refunded
                  orders, and confirm uniqueness. Interviewers trust BAs who treat numbers as definitions, not as
                  screenshots. Drill the patterns on our{' '}
                  <Link href="/interview-questions/topics/sql" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                    SQL interview questions
                  </Link>{' '}
                  topic page.
                </p>
              </section>
          </section>

          <section aria-labelledby="ba-salary">
              <h2
                id="ba-salary"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Business Analyst Salary Guide India 2026
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Salaries vary sharply by domain (fintech vs IT services), city, and whether the role is closer to
                analytics/product. Use these ranges as interviewing context, not as a guarantee.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                The biggest drivers in India are (1) domain complexity, (2) decision ownership, and (3) data strength.
                A BA who only documents is priced lower than a BA who can influence outcomes—conversion, risk reduction,
                compliance, or operational throughput.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-3">
                {[
                  {
                    title: 'Fresher / campus',
                    range: '₹4–8 LPA',
                    note: 'Common in IT services and entry roles. Strong SQL + communication can push you upward.',
                    tier: 'entry' as const,
                  },
                  {
                    title: '1–3 years',
                    range: '₹7–14 LPA',
                    note: 'You are expected to own modules, lead workshops, and write high-quality acceptance criteria.',
                    tier: 'mid' as const,
                  },
                  {
                    title: '3–6 years',
                    range: '₹12–25+ LPA',
                    note: 'Higher if you drive product outcomes, analytics, or domain-heavy systems (payments, risk, supply chain).',
                    tier: 'senior' as const,
                  },
                ].map((cell) => (
                  <section
                    key={cell.title}
                    className={`ie-role-ba-salary-tier ie-role-ba-salary-tier--${cell.tier}`}
                  >
                    <p className="ie-role-ba-salary-tier__label">{cell.title}</p>
                    <p className="ie-role-ba-salary-tier__range">{cell.range}</p>
                    <p className="ie-role-ba-salary-tier__note">{cell.note}</p>
                  </section>
                ))}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                To negotiate credibly, bring evidence: impact metrics, stakeholder outcomes, and how you reduced rework.
                If you can quantify “what changed because of my analysis,” you negotiate from strength. Tech-adjacent BA
                tracks in cloud-heavy accounts may also reference{' '}
                <Link href="/interview-questions/cloud-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  Cloud Engineer interview questions
                </Link>{' '}
                when discussing platform constraints—not because you need to code, but because you need to ask the right
                questions about integrations and SLAs.
              </p>
              <section className="mt-5 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
                <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                  What to say when asked about expected salary
                </h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Anchor on role scope and market range, then connect to your strengths. For example: “For a BA role
                  with requirement ownership, stakeholder workshops, and SQL-based validation, I’m targeting the
                  ₹X–₹Y LPA range. I’m confident because I can independently validate metrics, write testable acceptance
                  criteria, and reduce delivery rework.” This is stronger than quoting a number without context.
                </p>
              </section>
          </section>

          <section aria-labelledby="ba-roadmap">
              <h2
                id="ba-roadmap"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Business Analyst Career Roadmap
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                A good BA roadmap is not “learn everything.” It is a ladder of increasing ambiguity tolerance: from
                documenting known processes, to improving processes, to defining what should exist in the first place.
              </p>
              <div className="mt-4 space-y-4">
                {[
                  {
                    title: 'Stage 1 — Foundational BA (0–1 year)',
                    body:
                      'Learn to write clean user stories and acceptance criteria. Practice SQL joins and aggregation. Build one project where you can show requirement artifacts (BRD + flow + user stories).',
                  },
                  {
                    title: 'Stage 2 — Delivery owner (1–3 years)',
                    body:
                      'Own a module end-to-end: discovery → requirements → sprint support → UAT → launch. Build traceability (requirements → stories → test cases). Learn to quantify impact.',
                  },
                  {
                    title: 'Stage 3 — Domain specialist / product BA (3–6 years)',
                    body:
                      'Specialize in a domain where requirements are complex (payments, risk, supply chain). You will lead stakeholder alignment and design metrics with data teams.',
                  },
                  {
                    title: 'Stage 4 — Lead BA / Product / Program paths (6+ years)',
                    body:
                      'You can move into Lead BA, Product Manager, Program Manager, or Analytics roles. Your differentiator is decision quality: can you choose trade-offs that improve outcomes?',
                  },
                ].map((step) => (
                  <section
                    key={step.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {step.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {step.body}
                    </p>
                  </section>
                ))}
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                If you want structured practice for BA interviews (including communication scoring), use the{' '}
                <Link href="/tools/question-generator" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  free question generator
                </Link>{' '}
                and rehearse answers out loud before interviews.
              </p>
          </section>

          <section aria-labelledby="ba-certifications">
              <h2
                id="ba-certifications"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Certifications for Business Analysts
              </h2>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                Certifications help most when they map to a real workflow you can demonstrate. Treat them as structure,
                not as a replacement for projects.
              </p>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                A good rule: if you cannot explain how the certification changed your day-to-day decisions (better
                requirement quality, better stakeholder alignment, better metric definitions), it will not help much in
                interviews. Use certifications to build a language, then prove competence through artifacts and examples.
              </p>
              <div className="mt-4 grid gap-4 md:grid-cols-2">
                {[
                  {
                    title: 'IIBA ECBA / CCBA',
                    body:
                      'Useful for formal BA foundations and terminology. Stronger when paired with a portfolio of requirement artifacts.',
                  },
                  {
                    title: 'CBAP (experienced)',
                    body:
                      'A credibility signal for senior roles. Interviewers still expect strong examples of stakeholder alignment and delivery outcomes.',
                  },
                  {
                    title: 'Agile/Scrum certifications',
                    body:
                      'Helpful if your org is Agile-heavy. More valuable when you can explain grooming, sprint support, and definition-of-done in practice.',
                  },
                  {
                    title: 'Analytics-oriented (optional)',
                    body:
                      'Power BI/Tableau or a SQL certification can strengthen analytics BA roles. Keep focus on business decision-making, not tool trivia.',
                  },
                ].map((card) => (
                  <section
                    key={card.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {card.body}
                    </p>
                  </section>
                ))}
              </div>
              <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
                If you are a fresher, prioritize a small portfolio instead: one workflow-heavy case study (process flow
                + user stories + acceptance criteria) and one data-heavy case study (SQL analysis + metric definition +
                recommendation). Those two projects often outperform certificates in interviews. For Agile-heavy teams,
                pair certification study with{' '}
                <Link href="/interview-questions/topics/jira" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                  Jira interview questions
                </Link>{' '}
                so you can explain backlog hygiene in practice—not just on paper.
              </p>
          </section>

          <section aria-labelledby="ba-resume-mistakes">
            <h2
              id="ba-resume-mistakes"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Business Analyst Resume Mistakes That Cause Rejection
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              BA resumes are rejected less for “lack of skills” and more for lack of proof. Recruiters and hiring
              managers look for evidence that you can clarify ambiguity, work with stakeholders, and validate decisions
              with data.
            </p>
            <div className="mt-4 space-y-4">
              {[
                {
                  title: 'Generic resume summary',
                  bad: '“Seeking a challenging role to utilize my communication and analytical skills.”',
                  good:
                    '“Business Analyst focused on requirement elicitation + SQL validation. Built a refund workflow spec that reduced turnaround time in a college project simulation.”',
                },
                {
                  title: 'No measurable impact',
                  bad: '“Improved onboarding experience.”',
                  good:
                    '“Mapped onboarding flow, identified 3 drop-off points, and proposed a change that improved completion rate from 62% → 78% in testing.”',
                },
                {
                  title: 'Weak project descriptions',
                  bad: '“Made a food delivery app.”',
                  good:
                    '“Defined user stories + acceptance criteria for coupons and refunds, wrote BRD outline, and documented UAT test cases for 12 scenarios.”',
                },
                {
                  title: 'No stakeholder exposure',
                  bad: 'Only technical tasks listed, no communication artifacts.',
                  good:
                    'Mention workshops/interviews: “Conducted 6 stakeholder interviews, wrote decision log, and aligned priority with MoSCoW.”',
                },
                {
                  title: 'No SQL exposure / no business metrics',
                  bad: '“Good with Excel.”',
                  good:
                    'Include 2–3 queries or metrics: “Used SQL joins + aggregations to validate repeat users and monthly revenue; defined KPI formulas used in dashboard.”',
                },
                {
                  title: 'Keyword mismatch',
                  bad: 'Resume uses generic “analysis” but not role language.',
                  good:
                    'Use role keywords: BRD, user stories, acceptance criteria, UAT, stakeholder management, SQL, Jira, Agile ceremonies.',
                },
              ].map((m) => (
                <section
                  key={m.title}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {m.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Weak:</strong> {m.bad}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    <strong style={{ color: 'var(--text-primary)' }}>Stronger:</strong> {m.good}
                  </p>
                </section>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              If you’re applying to multiple tracks, tailor your language by role. Compare the expectations for{' '}
              <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Software Engineer interview questions
              </Link>{' '}
              and{' '}
              <Link href="/interview-questions/cloud-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Cloud Engineer interview questions
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="ba-project-example">
            <h2
              id="ba-project-example"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Real Business Analyst Project Example (Food Delivery Platform)
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Use this case study structure in interviews when asked “describe your project” or “how do you gather
              requirements?” The goal is to demonstrate BA thinking: define success, capture constraints, write testable
              requirements, and support delivery through UAT.
            </p>
            <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                Business problem
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                A food delivery platform saw a spike in cancellations and support tickets. Customers complained that
                refunds were inconsistent and slow. The business goal: reduce refund turnaround time and improve trust
                (measured via fewer tickets and higher reorder rate).
              </p>
            </section>
            <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                Stakeholder requests (what they asked for)
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <li>Support team: refund status visibility (no more “where is my refund?” calls).</li>
                <li>Finance: audit trail and approval for refunds above a threshold.</li>
                <li>Ops: clear exception handling (address issues, partial delivery, late delivery).</li>
                <li>Product: faster experience with minimal extra steps for customers.</li>
              </ul>
            </section>
            <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                Requirements gathering (how the BA worked)
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                The BA ran a workshop to map the as-is flow (swimlane) and collected the top cancellation reasons. Then
                they validated the claim with SQL: segment cancellations by reason, region, and restaurant category to
                find the biggest drivers. (This is why SQL appears in BA interviews.)
              </p>
            </section>
            <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                BRD preparation + user stories (what got written)
              </h3>
              <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                <li>
                  BRD scope: refund states, SLA tracking, approvals, audit logs, and customer notifications (out-of-scope: new payment provider).
                </li>
                <li>
                  User story example: “As a customer, I can see refund status with ETA so I don’t contact support.”
                </li>
                <li>
                  Acceptance criteria: state transitions, retry-safe updates, and clear messages for failures.
                </li>
              </ul>
            </section>
            <section className="mt-4 rounded-xl border p-4" style={{ borderColor: 'var(--card-border)', background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)' }}>
              <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                UAT + outcome (how success was measured)
              </h3>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                The BA prepared UAT test cases for 12 scenarios (partial refund, cancellation after pickup, payment
                failure, approval required). After release, the team tracked refund TAT, ticket volume, and reorder rate.
                The result: fewer “refund status” tickets and faster resolution for high-volume cases.
              </p>
            </section>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              You can use the same structure to answer situational questions like “revenue dropped” or “stakeholder
              rejects your report.” Practice articulating it clearly with{' '}
              <Link href="/signup" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                a free mock interview
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="ba-vs">
            <h2
              id="ba-vs"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Business Analyst vs Data Analyst vs Product Manager
            </h2>
            <div className="ie-role-ba-table-wrap mt-4">
              <table className="ie-role-ba-compare-table">
                <caption className="sr-only">
                  Comparison of Business Analyst, Data Analyst, and Product Manager roles across key dimensions
                </caption>
                <thead>
                  <tr>
                    <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--dim">
                      Dimension
                    </th>
                    <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--ba">
                      Business Analyst
                    </th>
                    <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--da">
                      Data Analyst
                    </th>
                    <th scope="col" className="ie-role-ba-compare-table__th ie-role-ba-compare-table__th--pm">
                      Product Manager
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['Responsibilities', 'Requirements + delivery clarity', 'Insights + reporting + metrics', 'Strategy + prioritization + outcomes'],
                    ['Tools', 'Jira, Confluence, SQL, flows', 'SQL, Python, BI tools', 'Roadmaps, analytics, stakeholder docs'],
                    ['Salary (India)', '₹4–25+ LPA (by scope)', '₹5–28+ LPA (by analytics depth)', '₹10–40+ LPA (by product scope)'],
                    ['Career growth', 'Lead BA / PM / Program', 'Analytics lead / DS track', 'Senior PM / Group PM'],
                    ['Technical skills', 'SQL + systems thinking', 'SQL + statistics + tooling', 'Metrics + decision frameworks'],
                    ['Stakeholder interaction', 'High (requirements + alignment)', 'Medium (insights + recommendations)', 'Very high (trade-offs + leadership)'],
                  ].map((row) => (
                    <tr key={row[0]}>
                      <th scope="row" className="ie-role-ba-compare-table__dim">
                        {row[0]}
                      </th>
                      <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--ba">{row[1]}</td>
                      <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--da">{row[2]}</td>
                      <td className="ie-role-ba-compare-table__cell ie-role-ba-compare-table__cell--pm">{row[3]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Explore each role’s question patterns:{' '}
              <Link href="/interview-questions/data-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Data Analyst
              </Link>
              ,{' '}
              <Link href="/interview-questions/product-manager" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Product Manager
              </Link>
              ,{' '}
              <Link href="/interview-questions/system-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                System Analyst
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="ba-roadmap-90">
            <h2
              id="ba-roadmap-90"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              30-60-90 Day Business Analyst Preparation Roadmap
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              This plan is designed for placement and early-career hiring. The goal is to build repeatable BA artifacts
              and the ability to explain them clearly under interview pressure.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              {[
                {
                  title: 'Month 1 (0–30 days)',
                  items: [
                    'Learn user stories + acceptance criteria (write 20).',
                    'Practice core SQL: joins, group by, HAVING (daily).',
                    'Build one process flow (as-is → to-be) for a real workflow.',
                    'Document decisions (scope, non-goals, constraints).',
                  ],
                },
                {
                  title: 'Month 2 (31–60 days)',
                  items: [
                    'Write a BRD outline for your project and get feedback.',
                    'Create a UAT plan: scenarios, data, expected results.',
                    'Rehearse 8 stakeholder scenarios (conflict, priorities, change requests).',
                    'Use Jira concepts: epics, stories, workflow states.',
                  ],
                },
                {
                  title: 'Month 3 (61–90 days)',
                  items: [
                    'Run mock interviews: 10 full sessions with review.',
                    'Prepare company-specific patterns (service vs product).',
                    'Quantify outcomes: KPIs, SLA improvements, conversion changes.',
                    'Polish resume with artifacts + measurable impact lines.',
                  ],
                },
              ].map((m) => (
                <section
                  key={m.title}
                  className="rounded-xl border p-4"
                  style={{
                    borderColor: 'var(--card-border)',
                    background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                  }}
                >
                  <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                    {m.title}
                  </h3>
                  <ul className="mt-2 list-disc pl-5 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {m.items.map((i) => (
                      <li key={i}>{i}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            <p className="mt-4 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              For focused practice, use{' '}
              <Link href="/tools/question-generator" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                the free question generator
              </Link>{' '}
              and review related banks like{' '}
              <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Software Engineer interview questions
              </Link>
              .
            </p>
          </section>

          <section aria-labelledby="ba-mistakes">
              <h2
                id="ba-mistakes"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Common Mistakes During BA Interviews
              </h2>
              <div className="mt-4 space-y-4">
                {[
                  {
                    title: 'Answering with buzzwords instead of artifacts',
                    body:
                      'Interviewers want to hear what you produced: BRD sections, user story format, acceptance criteria, traceability, and how you handled edge cases.',
                  },
                  {
                    title: 'Skipping metric definitions',
                    body:
                      'If you say “revenue dropped,” immediately explain what revenue means (gross vs net), what timeframe, and how you validated it. This is where SQL thinking shines.',
                  },
                  {
                    title: 'Ignoring non-functional requirements',
                    body:
                      'BA hires fail when they forget audit logs, permissions, latency, and operational workflows. Mention them proactively when describing requirements.',
                  },
                  {
                    title: 'Not showing stakeholder alignment',
                    body:
                      'A BA’s job is to convert disagreement into decisions. Explain how you handle conflict, document outcomes, and escalate with impact analysis.',
                  },
                ].map((card) => (
                  <section
                    key={card.title}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: 'var(--card-border)',
                      background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                    }}
                  >
                    <h3 className="m-0 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
                      {card.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                      {card.body}
                    </p>
                  </section>
                ))}
              </div>
          </section>

          <BaCompanyProcessSection />

          {/* ── Questions (preserved) ───────────────────────────────────────── */}
          <section aria-labelledby="ba-questions">
            <h2
              id="ba-questions"
              className="text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Business Analyst Interview Questions (With Expert Answers)
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed sm:text-base" style={{ color: 'var(--text-secondary)' }}>
              Use these questions to practice structured answers. For extra practice on adjacent tracks, see{' '}
              <Link href="/interview-questions/product-manager" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Product Manager
              </Link>
              ,{' '}
              <Link href="/interview-questions/data-analyst" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Data Analyst
              </Link>
              , and{' '}
              <Link href="/interview-questions/software-engineer" className="font-medium underline-offset-4 hover:underline" style={{ color: 'var(--accent-primary)' }}>
                Software Engineer
              </Link>
              .
            </p>
            <QuestionsList questions={questions} heading={`${role.pluralLabel} Interview Questions`} />
          </section>

          <section aria-labelledby="ba-faq">
              <h2
                id="ba-faq"
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Frequently Asked Questions
              </h2>
              <div className="ie-blog-faq-stack">
                {BA_FAQ_ITEMS.map((item) => (
                  <section key={item.question} className="ie-blog-faq-item">
                    <h3 className="ie-blog-faq-item__question">{item.question}</h3>
                    <p className="ie-blog-faq-item__answer">{item.answer}</p>
                  </section>
                ))}
              </div>
          </section>
          </div>
        </article>
      ) : null}

      {isAndroidHub ? (
        <AndroidDeveloperHubArticle role={role} questions={ANDROID_DEVELOPER_QUESTIONS} />
      ) : null}

      {isSweHub ? (
        <SoftwareEngineerHubArticle role={role} questions={questions} />
      ) : null}

      {isFeHub ? (
        <FrontendDeveloperHubArticle role={role} questions={questions} />
      ) : null}

      {/* ── Questions ────────────────────────────────────────────────────── */}
      {!isEditorialHub ? (
        <section className={CONTENT_SECTION}>
          <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
            <QuestionsList questions={questions} heading={`${role.pluralLabel} Interview Questions`} />
          </div>
        </section>
      ) : null}

      {/* ── Key skill topics (pill badges) ───────────────────────────────── */}
      {skillLinks.length > 0 ? (
        <section className={isEditorialHub ? 'py-8 md:py-12' : CONTENT_SECTION}>
          <div
            className={
              isEditorialHub
                ? BA_SHELL_CLASS
                : `${LANDING_PAGE_CONTAINER} px-4 sm:px-5`
            }
          >
            <div className={isEditorialHub ? BA_CONTENT_CLASS : undefined}>
              <h2
                className="text-xl font-bold tracking-tight sm:text-2xl"
                style={{ color: 'var(--text-primary)' }}
              >
                Key topics to prepare for {role.label} interviews
              </h2>
              <p
                className="mt-2 max-w-2xl text-sm leading-relaxed"
                style={{ color: 'var(--text-secondary)' }}
              >
                Recruiters test these skill areas specifically. Click any topic to see curated questions.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                {skillLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="inline-flex items-center rounded-full border px-4 py-2 text-sm font-medium transition-colors hover:border-(--accent-primary)"
                    style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {/* ── CTA ──────────────────────────────────────────────────────────── */}
      <section
        className={isEditorialHub ? 'border-y py-8 md:py-12' : `${CONTENT_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div
          className={
            isEditorialHub
              ? BA_SHELL_CLASS
              : `${LANDING_PAGE_CONTAINER} px-4 sm:px-5`
          }
        >
          <div className={isEditorialHub ? BA_CONTENT_CLASS : undefined}>
            <p
              className="text-xs font-bold uppercase tracking-[0.14em]"
              style={{ color: 'var(--accent-primary)' }}
            >
              Practice, not just reading
            </p>
            <h2
              className="mt-2 max-w-xl text-xl font-bold tracking-tight sm:text-2xl"
              style={{ color: 'var(--text-primary)' }}
            >
              Get scored on your {role.label} answers
            </h2>
            <p
              className="mt-2 max-w-xl text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              Upload your resume and practice a full {role.label} mock interview with AI-generated
              questions and rubric-based scoring across 5 dimensions — free to start.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/signup"
                className="inline-flex items-center justify-center rounded-full px-6 py-2.5 text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ background: 'var(--accent-primary)', color: '#fff' }}
              >
                Start free mock interview
              </Link>
              <Link
                href={qgDeepLinkPath('role', { role: role.label })}
                className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                Generate more questions free
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ── Engine-driven cross-link sections ────────────────────────────── */}
      <RelatedGuidesSection path={`/interview-questions/${role.slug}`} />
      {linkSections.map((section) =>
        isEditorialHub ? (
          <div key={section.heading} className={BA_SHELL_CLASS}>
            <div className={BA_CONTENT_CLASS}>
              <SeoCrossLinksSection heading={section.heading} links={section.links} />
            </div>
          </div>
        ) : (
          <SeoCrossLinksSection
            key={section.heading}
            heading={section.heading}
            links={section.links}
          />
        ),
      )}
    </>
  )
}

function InfoBadge({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center rounded-full px-3 py-1 text-xs font-medium"
      style={{
        background: `color-mix(in srgb, ${color} 14%, transparent)`,
        color: 'var(--text-secondary)',
      }}
    >
      {label}
    </span>
  )
}
