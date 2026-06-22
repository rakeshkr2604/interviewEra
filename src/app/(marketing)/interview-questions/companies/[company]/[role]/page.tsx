import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import Link from 'next/link'
import { JsonLdScript } from '@/components/seo/JsonLdScript'
import { breadcrumbListJsonLd, faqPageJsonLd } from '@/lib/seo/schema/jsonld'
import { canonicalUrl, getCanonicalSiteOrigin } from '@/lib/seo/site-url'
import { generateMetadata as baseGenerateMetadata } from '@/lib/seo/metadata'
import { schemaIds } from '@/lib/seo/metadata'
import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection'
import { RelatedGuidesSection } from '@/components/content/RelatedGuidesSection'
import { AmazonSeHubArticle } from '@/components/programmatic/AmazonSeHubArticle'
import { MicrosoftSeHubArticle } from '@/components/programmatic/MicrosoftSeHubArticle'
import { InfosysJavaHubArticle } from '@/components/programmatic/InfosysJavaHubArticle'
import { InfosysSeHubArticle } from '@/components/programmatic/InfosysSeHubArticle'
import { FreshworksFeHubArticle } from '@/components/programmatic/FreshworksFeHubArticle'
import { WiproDaHubArticle } from '@/components/programmatic/WiproDaHubArticle'
import { WiproQaHubArticle } from '@/components/programmatic/WiproQaHubArticle'
import { WiproSweHubArticle } from '@/components/programmatic/WiproSweHubArticle'
import { WiproJavaHubArticle } from '@/components/programmatic/WiproJavaHubArticle'
import { QuestionsList } from '@/components/programmatic/QuestionsList'
import {
  getCompanyBySlug,
  getRoleBySlug,
  highValueIntersectionParams,
  companyQuestionsPath,
  questionsHubPath,
  intersectionQuestionsPath,
} from '@/lib/seo/programmatic'
import {
  intersectionPageMetadata,
  intersectionBreadcrumbs,
} from '@/lib/seo/programmatic/metadata'
import {
  getCompanyQuestionsFlat,
  getRoleQuestionsFlat,
  buildFaqPairs,
} from '@/lib/seo/programmatic/questions'
import {
  AMAZON_FAQ_ITEMS,
  AMAZON_SE_HERO_ALT,
  AMAZON_SE_HERO_HEIGHT,
  AMAZON_SE_HERO_PATH,
  AMAZON_SE_HERO_WIDTH,
  AMAZON_SE_META_TITLE,
  AMAZON_SE_DESCRIPTION,
  AMAZON_SE_CANONICAL_PATH,
  AMAZON_SE_LAST_UPDATED,
  AMAZON_SE_PUBLISHED_DATE,
  AMAZON_SE_AUTHOR_NAME,
  AMAZON_SE_REVIEWED_DATE,
  AMAZON_SE_REVIEWER_NAME,
  AMAZON_SE_PROCESS_ALT,
  AMAZON_SE_PROCESS_HEIGHT,
  AMAZON_SE_PROCESS_PATH,
  AMAZON_SE_PROCESS_WIDTH,
} from '@/lib/seo/programmatic/amazon-se-hub'
import {
  MICROSOFT_FAQ_ITEMS,
  MICROSOFT_SE_HERO_ALT,
  MICROSOFT_SE_HERO_HEIGHT,
  MICROSOFT_SE_HERO_PATH,
  MICROSOFT_SE_HERO_WIDTH,
  MICROSOFT_SE_META_TITLE,
  MICROSOFT_SE_DESCRIPTION,
  MICROSOFT_SE_CANONICAL_PATH,
  MICROSOFT_SE_LAST_UPDATED,
  MICROSOFT_SE_PUBLISHED_DATE,
  MICROSOFT_SE_AUTHOR_NAME,
  MICROSOFT_SE_REVIEWED_DATE,
  MICROSOFT_SE_REVIEWER_NAME,
  MICROSOFT_SE_PROCESS_ALT,
  MICROSOFT_SE_PROCESS_HEIGHT,
  MICROSOFT_SE_PROCESS_PATH,
  MICROSOFT_SE_PROCESS_WIDTH,
} from '@/lib/seo/programmatic/microsoft-se-hub'
import {
  INFOSYS_FAQ_ITEMS,
  INFOSYS_JAVA_HERO_ALT,
  INFOSYS_JAVA_HERO_HEIGHT,
  INFOSYS_JAVA_HERO_PATH,
  INFOSYS_JAVA_HERO_WIDTH,
  INFOSYS_JAVA_META_TITLE,
  INFOSYS_JAVA_DESCRIPTION,
  INFOSYS_JAVA_CANONICAL_PATH,
  INFOSYS_JAVA_LAST_UPDATED,
  INFOSYS_JAVA_PUBLISHED_DATE,
  INFOSYS_JAVA_AUTHOR_NAME,
  INFOSYS_JAVA_REVIEWED_DATE,
  INFOSYS_JAVA_REVIEWER_NAME,
  INFOSYS_JAVA_PROCESS_ALT,
  INFOSYS_JAVA_PROCESS_HEIGHT,
  INFOSYS_JAVA_PROCESS_PATH,
  INFOSYS_JAVA_PROCESS_WIDTH,
} from '@/lib/seo/programmatic/infosys-java-hub'
import {
  INFOSYS_SE_FAQ_ITEMS,
  INFOSYS_SE_HERO_ALT,
  INFOSYS_SE_HERO_HEIGHT,
  INFOSYS_SE_HERO_PATH,
  INFOSYS_SE_HERO_WIDTH,
  INFOSYS_SE_PROCESS_ALT,
  INFOSYS_SE_PROCESS_HEIGHT,
  INFOSYS_SE_PROCESS_PATH,
  INFOSYS_SE_PROCESS_WIDTH,
  INFOSYS_SE_META_TITLE,
  INFOSYS_SE_DESCRIPTION,
  INFOSYS_SE_CANONICAL_PATH,
  INFOSYS_SE_LAST_UPDATED,
  INFOSYS_SE_PUBLISHED_DATE,
  INFOSYS_SE_AUTHOR_NAME,
  INFOSYS_SE_REVIEWED_DATE,
  INFOSYS_SE_REVIEWER_NAME,
} from '@/lib/seo/programmatic/infosys-se-hub'
import {
  FRESHWORKS_FAQ_ITEMS,
  FRESHWORKS_FE_HERO_ALT,
  FRESHWORKS_FE_HERO_HEIGHT,
  FRESHWORKS_FE_HERO_PATH,
  FRESHWORKS_FE_HERO_WIDTH,
  FRESHWORKS_FE_LAST_UPDATED,
  FRESHWORKS_FE_META_TITLE,
  FRESHWORKS_FE_DESCRIPTION,
  FRESHWORKS_FE_CANONICAL_PATH,
  FRESHWORKS_FE_PUBLISHED_DATE,
  FRESHWORKS_FE_AUTHOR_NAME,
  FRESHWORKS_FE_REVIEWED_DATE,
  FRESHWORKS_FE_REVIEWER_NAME,
  FRESHWORKS_FE_PROCESS_ALT,
  FRESHWORKS_FE_PROCESS_HEIGHT,
  FRESHWORKS_FE_PROCESS_PATH,
  FRESHWORKS_FE_PROCESS_WIDTH,
  FRESHWORKS_FE_QUESTIONS,
  isFreshworksFrontendDeveloperHub,
} from '@/lib/seo/programmatic/freshworks-fe-hub'
import {
  WIPRO_DA_FAQ_ITEMS,
  WIPRO_DA_HERO_ALT,
  WIPRO_DA_HERO_HEIGHT,
  WIPRO_DA_HERO_PATH,
  WIPRO_DA_HERO_WIDTH,
  WIPRO_DA_META_TITLE,
  WIPRO_DA_DESCRIPTION,
  WIPRO_DA_CANONICAL_PATH,
  WIPRO_DA_LAST_UPDATED,
  WIPRO_DA_PUBLISHED_DATE,
  WIPRO_DA_AUTHOR_NAME,
  WIPRO_DA_REVIEWED_DATE,
  WIPRO_DA_REVIEWER_NAME,
  WIPRO_DA_PROCESS_ALT,
  WIPRO_DA_PROCESS_HEIGHT,
  WIPRO_DA_PROCESS_PATH,
  WIPRO_DA_PROCESS_WIDTH,
  WIPRO_DA_QUESTIONS,
  isWiproDataAnalystHub,
} from '@/lib/seo/programmatic/wipro-da-hub'
import {
  WIPRO_QA_FAQ_ITEMS,
  WIPRO_QA_HERO_ALT,
  WIPRO_QA_HERO_HEIGHT,
  WIPRO_QA_HERO_PATH,
  WIPRO_QA_HERO_WIDTH,
  WIPRO_QA_META_TITLE,
  WIPRO_QA_DESCRIPTION,
  WIPRO_QA_CANONICAL_PATH,
  WIPRO_QA_LAST_UPDATED,
  WIPRO_QA_PUBLISHED_DATE,
  WIPRO_QA_AUTHOR_NAME,
  WIPRO_QA_REVIEWED_DATE,
  WIPRO_QA_REVIEWER_NAME,
  WIPRO_QA_PROCESS_ALT,
  WIPRO_QA_PROCESS_HEIGHT,
  WIPRO_QA_PROCESS_PATH,
  WIPRO_QA_PROCESS_WIDTH,
  WIPRO_QA_QUESTIONS,
  isWiproQaEngineerHub,
} from '@/lib/seo/programmatic/wipro-qa-hub'
import {
  WIPRO_SWE_FAQ_ITEMS,
  WIPRO_SWE_HERO_ALT,
  WIPRO_SWE_HERO_HEIGHT,
  WIPRO_SWE_HERO_PATH,
  WIPRO_SWE_HERO_WIDTH,
  WIPRO_SWE_META_TITLE,
  WIPRO_SWE_DESCRIPTION,
  WIPRO_SWE_CANONICAL_PATH,
  WIPRO_SWE_LAST_UPDATED,
  WIPRO_SWE_PUBLISHED_DATE,
  WIPRO_SWE_AUTHOR_NAME,
  WIPRO_SWE_REVIEWED_DATE,
  WIPRO_SWE_REVIEWER_NAME,
  WIPRO_SWE_PROCESS_ALT,
  WIPRO_SWE_PROCESS_HEIGHT,
  WIPRO_SWE_PROCESS_PATH,
  WIPRO_SWE_PROCESS_WIDTH,
  WIPRO_SWE_QUESTIONS,
  isWiproSoftwareEngineerHub,
} from '@/lib/seo/programmatic/wipro-swe-hub'
import {
  WIPRO_JAVA_FAQ_ITEMS,
  WIPRO_JAVA_HERO_ALT,
  WIPRO_JAVA_HERO_HEIGHT,
  WIPRO_JAVA_HERO_PATH,
  WIPRO_JAVA_HERO_WIDTH,
  WIPRO_JAVA_META_TITLE,
  WIPRO_JAVA_DESCRIPTION,
  WIPRO_JAVA_CANONICAL_PATH,
  WIPRO_JAVA_LAST_UPDATED,
  WIPRO_JAVA_PUBLISHED_DATE,
  WIPRO_JAVA_AUTHOR_NAME,
  WIPRO_JAVA_REVIEWED_DATE,
  WIPRO_JAVA_REVIEWER_NAME,
  WIPRO_JAVA_PROCESS_ALT,
  WIPRO_JAVA_PROCESS_HEIGHT,
  WIPRO_JAVA_PROCESS_PATH,
  WIPRO_JAVA_PROCESS_WIDTH,
  WIPRO_JAVA_QUESTIONS,
  isWiproJavaDeveloperHub,
} from '@/lib/seo/programmatic/wipro-java-hub'
import { LANDING_PAGE_CONTAINER, CONTENT_SECTION } from '@/lib/landing/container'
import { buildIntersectionPageLinks } from '@/lib/seo/internal-linking'
import '../../../../blog/blog.css'

export function generateStaticParams() {
  return highValueIntersectionParams()
}

type Props = { params: Promise<{ company: string; role: string }> }

function isAmazonSoftwareEngineerHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'amazon' && roleSlug === 'software-engineer'
}

function isMicrosoftSoftwareEngineerHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'microsoft' && roleSlug === 'software-engineer'
}

function isInfosysJavaDeveloperHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'infosys' && roleSlug === 'java-developer'
}

function isInfosysSoftwareEngineerHub(companySlug: string, roleSlug: string): boolean {
  return companySlug === 'infosys' && roleSlug === 'software-engineer'
}

function isFreshworksFeHub(companySlug: string, roleSlug: string): boolean {
  return isFreshworksFrontendDeveloperHub(companySlug, roleSlug)
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { company: companySl, role: roleSl } = await params
  const company = getCompanyBySlug(companySl)
  const role = getRoleBySlug(roleSl)
  if (!company || !role) return {}

  if (isAmazonSoftwareEngineerHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: AMAZON_SE_META_TITLE,
      description: AMAZON_SE_DESCRIPTION,
      path: AMAZON_SE_CANONICAL_PATH,
      keywords: [
        'Amazon software engineer interview questions',
        'Amazon SDE interview 2026',
        'Amazon Leadership Principles interview',
        'Amazon Bar Raiser interview',
        'Amazon online assessment SDE',
        'Amazon technical interview India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isInfosysSoftwareEngineerHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: INFOSYS_SE_META_TITLE,
      description: INFOSYS_SE_DESCRIPTION,
      path: INFOSYS_SE_CANONICAL_PATH,
      keywords: [
        'Infosys Software Engineer interview questions',
        'Infosys SE interview 2026',
        'Infosys InfyTQ',
        'Infosys HackWithInfy',
        'Infosys aptitude round',
        'Infosys coding round',
        'Infosys technical interview India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isInfosysJavaDeveloperHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: INFOSYS_JAVA_META_TITLE,
      description: INFOSYS_JAVA_DESCRIPTION,
      path: INFOSYS_JAVA_CANONICAL_PATH,
      keywords: [
        'Infosys Java Developer interview questions',
        'Infosys Java interview 2026',
        'Infosys InfyTQ Java',
        'Infosys Spring Boot interview',
        'Infosys coding round Java',
        'Infosys Java fresher interview',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isFreshworksFeHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: FRESHWORKS_FE_META_TITLE,
      description: FRESHWORKS_FE_DESCRIPTION,
      path: FRESHWORKS_FE_CANONICAL_PATH,
      keywords: [
        'Freshworks Frontend Developer interview questions',
        'Freshworks frontend interview 2026',
        'Freshworks React interview',
        'Freshworks JavaScript interview',
        'Freshworks frontend hiring process',
        'Freshworks frontend developer India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isWiproDataAnalystHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: WIPRO_DA_META_TITLE,
      description: WIPRO_DA_DESCRIPTION,
      path: WIPRO_DA_CANONICAL_PATH,
      keywords: [
        'Wipro Data Analyst interview questions',
        'Wipro DA interview 2026',
        'Wipro NLTH data analyst',
        'Wipro SQL interview',
        'Wipro data analyst salary',
        'Wipro data analyst fresher',
        'Wipro analytics interview India',
      ],
      ogImage: `${getCanonicalSiteOrigin()}${WIPRO_DA_HERO_PATH}`,
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isWiproQaEngineerHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: WIPRO_QA_META_TITLE,
      description: WIPRO_QA_DESCRIPTION,
      path: WIPRO_QA_CANONICAL_PATH,
      keywords: [
        'Wipro QA Engineer interview questions',
        'Wipro QA interview 2026',
        'Wipro NLTH QA engineer',
        'Wipro Selenium interview',
        'Wipro QA salary',
        'Wipro QA fresher',
        'Wipro manual testing interview India',
      ],
      ogImage: `${getCanonicalSiteOrigin()}${WIPRO_QA_HERO_PATH}`,
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isWiproSoftwareEngineerHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: WIPRO_SWE_META_TITLE,
      description: WIPRO_SWE_DESCRIPTION,
      path: WIPRO_SWE_CANONICAL_PATH,
      keywords: [
        'Wipro Software Engineer interview questions',
        'Wipro SWE interview 2026',
        'Wipro NLTH software engineer',
        'Wipro DSA interview',
        'Wipro SWE salary',
        'Wipro SWE fresher',
        'Wipro coding interview India',
      ],
      ogImage: `${getCanonicalSiteOrigin()}${WIPRO_SWE_HERO_PATH}`,
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isWiproJavaDeveloperHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: WIPRO_JAVA_META_TITLE,
      description: WIPRO_JAVA_DESCRIPTION,
      path: WIPRO_JAVA_CANONICAL_PATH,
      keywords: [
        'Wipro Java Developer interview questions',
        'Wipro Java interview 2026',
        'Wipro NLTH Java developer',
        'Wipro Spring Boot interview',
        'Wipro Java salary',
        'Wipro Java fresher',
        'Wipro Core Java interview India',
      ],
      ogImage: `${getCanonicalSiteOrigin()}${WIPRO_JAVA_HERO_PATH}`,
      openGraphType: 'article',
      noIndex: false,
    })
  }

  if (isMicrosoftSoftwareEngineerHub(company.slug, role.slug)) {
    return baseGenerateMetadata({
      title: MICROSOFT_SE_META_TITLE,
      description: MICROSOFT_SE_DESCRIPTION,
      path: MICROSOFT_SE_CANONICAL_PATH,
      keywords: [
        'Microsoft software engineer interview questions',
        'top 10 Microsoft SDE interview questions',
        'Microsoft SDE interview 2026',
        'Microsoft growth mindset interview',
        'Microsoft online assessment SDE',
        'Microsoft system design interview',
        'Microsoft hiring manager round India',
      ],
      openGraphType: 'article',
      noIndex: false,
    })
  }

  return intersectionPageMetadata(company, role)
}

const ORIGIN = getCanonicalSiteOrigin()
const HUB_SHELL_CLASS =
  'ie-blog-prose ie-blog-prose--interview-anxiety ie-role-ba-shell mx-auto w-full px-4 sm:px-5'

export default async function IntersectionQuestionsPage({ params }: Props) {
  const { company: companySl, role: roleSl } = await params
  const company = getCompanyBySlug(companySl)
  const role = getRoleBySlug(roleSl)
  if (!company || !role) notFound()

  const isAmazonHub = isAmazonSoftwareEngineerHub(company.slug, role.slug)
  const isMicrosoftHub = isMicrosoftSoftwareEngineerHub(company.slug, role.slug)
  const isInfosysJavaHub = isInfosysJavaDeveloperHub(company.slug, role.slug)
  const isInfosysSeHub = isInfosysSoftwareEngineerHub(company.slug, role.slug)
  const isFreshworksFeHubPage = isFreshworksFeHub(company.slug, role.slug)
  const isWiproDaHub = isWiproDataAnalystHub(company.slug, role.slug)
  const isWiproQaHub = isWiproQaEngineerHub(company.slug, role.slug)
  const isWiproSweHub = isWiproSoftwareEngineerHub(company.slug, role.slug)
  const isWiproJavaHub = isWiproJavaDeveloperHub(company.slug, role.slug)
  const isEditorialHub = isAmazonHub || isMicrosoftHub || isInfosysJavaHub || isInfosysSeHub || isFreshworksFeHubPage || isWiproDaHub || isWiproQaHub || isWiproSweHub || isWiproJavaHub
  const questions = isAmazonHub
    ? getCompanyQuestionsFlat('amazon')
    : isMicrosoftHub
      ? getCompanyQuestionsFlat('microsoft')
      : isInfosysSeHub
        ? getCompanyQuestionsFlat('infosys')
        : isInfosysJavaHub
          ? getRoleQuestionsFlat('java-developer')
          : isFreshworksFeHubPage
            ? FRESHWORKS_FE_QUESTIONS
            : isWiproDaHub
              ? WIPRO_DA_QUESTIONS
              : isWiproQaHub
                ? WIPRO_QA_QUESTIONS
                : isWiproSweHub
                  ? WIPRO_SWE_QUESTIONS
                  : isWiproJavaHub
                    ? WIPRO_JAVA_QUESTIONS
                    : getRoleQuestionsFlat(role.slug)
  const faqPairs = buildFaqPairs(questions)

  const BREADCRUMB_LD = breadcrumbListJsonLd(
    intersectionBreadcrumbs(company, role),
    ORIGIN,
  )
  const FAQ_LD = isAmazonHub
    ? faqPageJsonLd([...AMAZON_FAQ_ITEMS])
    : isMicrosoftHub
      ? faqPageJsonLd([...MICROSOFT_FAQ_ITEMS])
      : isInfosysSeHub
        ? faqPageJsonLd([...INFOSYS_SE_FAQ_ITEMS])
        : isInfosysJavaHub
          ? faqPageJsonLd([...INFOSYS_FAQ_ITEMS])
          : isFreshworksFeHubPage
            ? faqPageJsonLd([...FRESHWORKS_FAQ_ITEMS])
            : isWiproDaHub
              ? faqPageJsonLd([...WIPRO_DA_FAQ_ITEMS])
              : isWiproQaHub
                ? faqPageJsonLd([...WIPRO_QA_FAQ_ITEMS])
                : isWiproSweHub
                  ? faqPageJsonLd([...WIPRO_SWE_FAQ_ITEMS])
                  : isWiproJavaHub
                    ? faqPageJsonLd([...WIPRO_JAVA_FAQ_ITEMS])
                    : faqPairs.length > 0
          ? faqPageJsonLd(faqPairs)
          : null

  const AMAZON_PAGE_LD = isAmazonHub
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
            '@id': `${ORIGIN}#amazon-se-author`,
            name: AMAZON_SE_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#amazon-se-reviewer`,
            name: AMAZON_SE_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${AMAZON_SE_HERO_PATH}#image`,
            url: `${ORIGIN}${AMAZON_SE_HERO_PATH}`,
            contentUrl: `${ORIGIN}${AMAZON_SE_HERO_PATH}`,
            caption: AMAZON_SE_HERO_ALT,
            width: AMAZON_SE_HERO_WIDTH,
            height: AMAZON_SE_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${AMAZON_SE_PROCESS_PATH}#image`,
            url: `${ORIGIN}${AMAZON_SE_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${AMAZON_SE_PROCESS_PATH}`,
            caption: AMAZON_SE_PROCESS_ALT,
            width: AMAZON_SE_PROCESS_WIDTH,
            height: AMAZON_SE_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(AMAZON_SE_CANONICAL_PATH),
            url: canonicalUrl(AMAZON_SE_CANONICAL_PATH),
            name: AMAZON_SE_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${AMAZON_SE_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(AMAZON_SE_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(AMAZON_SE_CANONICAL_PATH)}#article`,
            headline: AMAZON_SE_META_TITLE,
            description: AMAZON_SE_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(AMAZON_SE_CANONICAL_PATH) },
            url: canonicalUrl(AMAZON_SE_CANONICAL_PATH),
            datePublished: AMAZON_SE_PUBLISHED_DATE,
            dateModified: AMAZON_SE_LAST_UPDATED,
            dateReviewed: AMAZON_SE_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#amazon-se-author` },
            reviewedBy: { '@id': `${ORIGIN}#amazon-se-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${AMAZON_SE_HERO_PATH}#image` },
          },
        ],
      }
    : null

  const MICROSOFT_PAGE_LD = isMicrosoftHub
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
            '@id': `${ORIGIN}#microsoft-se-author`,
            name: MICROSOFT_SE_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#microsoft-se-reviewer`,
            name: MICROSOFT_SE_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${MICROSOFT_SE_HERO_PATH}#image`,
            url: `${ORIGIN}${MICROSOFT_SE_HERO_PATH}`,
            contentUrl: `${ORIGIN}${MICROSOFT_SE_HERO_PATH}`,
            caption: MICROSOFT_SE_HERO_ALT,
            width: MICROSOFT_SE_HERO_WIDTH,
            height: MICROSOFT_SE_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${MICROSOFT_SE_PROCESS_PATH}#image`,
            url: `${ORIGIN}${MICROSOFT_SE_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${MICROSOFT_SE_PROCESS_PATH}`,
            caption: MICROSOFT_SE_PROCESS_ALT,
            width: MICROSOFT_SE_PROCESS_WIDTH,
            height: MICROSOFT_SE_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(MICROSOFT_SE_CANONICAL_PATH),
            url: canonicalUrl(MICROSOFT_SE_CANONICAL_PATH),
            name: MICROSOFT_SE_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${MICROSOFT_SE_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(MICROSOFT_SE_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(MICROSOFT_SE_CANONICAL_PATH)}#article`,
            headline: MICROSOFT_SE_META_TITLE,
            description: MICROSOFT_SE_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(MICROSOFT_SE_CANONICAL_PATH) },
            url: canonicalUrl(MICROSOFT_SE_CANONICAL_PATH),
            datePublished: MICROSOFT_SE_PUBLISHED_DATE,
            dateModified: MICROSOFT_SE_LAST_UPDATED,
            dateReviewed: MICROSOFT_SE_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#microsoft-se-author` },
            reviewedBy: { '@id': `${ORIGIN}#microsoft-se-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${MICROSOFT_SE_HERO_PATH}#image` },
          },
        ],
      }
    : null

  const INFOSYS_JAVA_PAGE_LD = isInfosysJavaHub
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
            '@id': `${ORIGIN}#infosys-java-author`,
            name: INFOSYS_JAVA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#infosys-java-reviewer`,
            name: INFOSYS_JAVA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${INFOSYS_JAVA_HERO_PATH}#image`,
            url: `${ORIGIN}${INFOSYS_JAVA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${INFOSYS_JAVA_HERO_PATH}`,
            caption: INFOSYS_JAVA_HERO_ALT,
            width: INFOSYS_JAVA_HERO_WIDTH,
            height: INFOSYS_JAVA_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${INFOSYS_JAVA_PROCESS_PATH}#image`,
            url: `${ORIGIN}${INFOSYS_JAVA_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${INFOSYS_JAVA_PROCESS_PATH}`,
            caption: INFOSYS_JAVA_PROCESS_ALT,
            width: INFOSYS_JAVA_PROCESS_WIDTH,
            height: INFOSYS_JAVA_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH),
            url: canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH),
            name: INFOSYS_JAVA_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${INFOSYS_JAVA_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH)}#article`,
            headline: INFOSYS_JAVA_META_TITLE,
            description: INFOSYS_JAVA_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH) },
            url: canonicalUrl(INFOSYS_JAVA_CANONICAL_PATH),
            datePublished: INFOSYS_JAVA_PUBLISHED_DATE,
            dateModified: INFOSYS_JAVA_LAST_UPDATED,
            dateReviewed: INFOSYS_JAVA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#infosys-java-author` },
            reviewedBy: { '@id': `${ORIGIN}#infosys-java-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${INFOSYS_JAVA_HERO_PATH}#image` },
          },
        ],
      }
    : null

  const INFOSYS_SE_PAGE_LD = isInfosysSeHub
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
            '@id': `${ORIGIN}#infosys-se-author`,
            name: INFOSYS_SE_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#infosys-se-reviewer`,
            name: INFOSYS_SE_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${INFOSYS_SE_HERO_PATH}#image`,
            url: `${ORIGIN}${INFOSYS_SE_HERO_PATH}`,
            contentUrl: `${ORIGIN}${INFOSYS_SE_HERO_PATH}`,
            caption: INFOSYS_SE_HERO_ALT,
            width: INFOSYS_SE_HERO_WIDTH,
            height: INFOSYS_SE_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${INFOSYS_SE_PROCESS_PATH}#image`,
            url: `${ORIGIN}${INFOSYS_SE_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${INFOSYS_SE_PROCESS_PATH}`,
            caption: INFOSYS_SE_PROCESS_ALT,
            width: INFOSYS_SE_PROCESS_WIDTH,
            height: INFOSYS_SE_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(INFOSYS_SE_CANONICAL_PATH),
            url: canonicalUrl(INFOSYS_SE_CANONICAL_PATH),
            name: INFOSYS_SE_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${INFOSYS_SE_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(INFOSYS_SE_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(INFOSYS_SE_CANONICAL_PATH)}#article`,
            headline: INFOSYS_SE_META_TITLE,
            description: INFOSYS_SE_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(INFOSYS_SE_CANONICAL_PATH) },
            url: canonicalUrl(INFOSYS_SE_CANONICAL_PATH),
            datePublished: INFOSYS_SE_PUBLISHED_DATE,
            dateModified: INFOSYS_SE_LAST_UPDATED,
            dateReviewed: INFOSYS_SE_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#infosys-se-author` },
            reviewedBy: { '@id': `${ORIGIN}#infosys-se-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${INFOSYS_SE_HERO_PATH}#image` },
          },
        ],
      }
    : null

  const FRESHWORKS_FE_PAGE_LD = isFreshworksFeHubPage
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
            '@id': `${ORIGIN}#freshworks-fe-author`,
            name: FRESHWORKS_FE_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#freshworks-fe-reviewer`,
            name: FRESHWORKS_FE_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${FRESHWORKS_FE_HERO_PATH}#image`,
            url: `${ORIGIN}${FRESHWORKS_FE_HERO_PATH}`,
            contentUrl: `${ORIGIN}${FRESHWORKS_FE_HERO_PATH}`,
            caption: FRESHWORKS_FE_HERO_ALT,
            width: FRESHWORKS_FE_HERO_WIDTH,
            height: FRESHWORKS_FE_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${FRESHWORKS_FE_PROCESS_PATH}#image`,
            url: `${ORIGIN}${FRESHWORKS_FE_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${FRESHWORKS_FE_PROCESS_PATH}`,
            caption: FRESHWORKS_FE_PROCESS_ALT,
            width: FRESHWORKS_FE_PROCESS_WIDTH,
            height: FRESHWORKS_FE_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH),
            url: canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH),
            name: FRESHWORKS_FE_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${FRESHWORKS_FE_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH)}#article`,
            headline: FRESHWORKS_FE_META_TITLE,
            description: FRESHWORKS_FE_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH) },
            url: canonicalUrl(FRESHWORKS_FE_CANONICAL_PATH),
            datePublished: FRESHWORKS_FE_PUBLISHED_DATE,
            dateModified: FRESHWORKS_FE_LAST_UPDATED,
            dateReviewed: FRESHWORKS_FE_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#freshworks-fe-author` },
            reviewedBy: { '@id': `${ORIGIN}#freshworks-fe-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${FRESHWORKS_FE_HERO_PATH}#image` },
          },
        ],
      }
    : null

  const WIPRO_DA_PAGE_LD = isWiproDaHub
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
            '@id': `${ORIGIN}#wipro-da-author`,
            name: WIPRO_DA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#wipro-da-reviewer`,
            name: WIPRO_DA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_DA_HERO_PATH}#image`,
            url: `${ORIGIN}${WIPRO_DA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_DA_HERO_PATH}`,
            caption: WIPRO_DA_HERO_ALT,
            width: WIPRO_DA_HERO_WIDTH,
            height: WIPRO_DA_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_DA_PROCESS_PATH}#image`,
            url: `${ORIGIN}${WIPRO_DA_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_DA_PROCESS_PATH}`,
            caption: WIPRO_DA_PROCESS_ALT,
            width: WIPRO_DA_PROCESS_WIDTH,
            height: WIPRO_DA_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(WIPRO_DA_CANONICAL_PATH),
            url: canonicalUrl(WIPRO_DA_CANONICAL_PATH),
            name: WIPRO_DA_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${WIPRO_DA_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(WIPRO_DA_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(WIPRO_DA_CANONICAL_PATH)}#article`,
            headline: WIPRO_DA_META_TITLE,
            description: WIPRO_DA_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(WIPRO_DA_CANONICAL_PATH) },
            url: canonicalUrl(WIPRO_DA_CANONICAL_PATH),
            datePublished: WIPRO_DA_PUBLISHED_DATE,
            dateModified: WIPRO_DA_LAST_UPDATED,
            dateReviewed: WIPRO_DA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#wipro-da-author` },
            reviewedBy: { '@id': `${ORIGIN}#wipro-da-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${WIPRO_DA_HERO_PATH}#image` },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: [
                'h1',
                '#wipro-da-overview',
                '#wipro-da-hiring-process',
                '#wipro-da-salary',
                '#wipro-da-questions',
              ],
            },
          },
        ],
      }
    : null

  const WIPRO_QA_PAGE_LD = isWiproQaHub
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
            '@id': `${ORIGIN}#wipro-qa-author`,
            name: WIPRO_QA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#wipro-qa-reviewer`,
            name: WIPRO_QA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_QA_HERO_PATH}#image`,
            url: `${ORIGIN}${WIPRO_QA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_QA_HERO_PATH}`,
            caption: WIPRO_QA_HERO_ALT,
            width: WIPRO_QA_HERO_WIDTH,
            height: WIPRO_QA_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_QA_PROCESS_PATH}#image`,
            url: `${ORIGIN}${WIPRO_QA_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_QA_PROCESS_PATH}`,
            caption: WIPRO_QA_PROCESS_ALT,
            width: WIPRO_QA_PROCESS_WIDTH,
            height: WIPRO_QA_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(WIPRO_QA_CANONICAL_PATH),
            url: canonicalUrl(WIPRO_QA_CANONICAL_PATH),
            name: WIPRO_QA_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${WIPRO_QA_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(WIPRO_QA_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(WIPRO_QA_CANONICAL_PATH)}#article`,
            headline: WIPRO_QA_META_TITLE,
            description: WIPRO_QA_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(WIPRO_QA_CANONICAL_PATH) },
            url: canonicalUrl(WIPRO_QA_CANONICAL_PATH),
            datePublished: WIPRO_QA_PUBLISHED_DATE,
            dateModified: WIPRO_QA_LAST_UPDATED,
            dateReviewed: WIPRO_QA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#wipro-qa-author` },
            reviewedBy: { '@id': `${ORIGIN}#wipro-qa-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${WIPRO_QA_HERO_PATH}#image` },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: [
                'h1',
                '#wipro-qa-overview',
                '#wipro-qa-hiring-process',
                '#wipro-qa-salary',
                '#wipro-qa-questions',
              ],
            },
          },
        ],
      }
    : null

  const WIPRO_SWE_PAGE_LD = isWiproSweHub
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
            '@id': `${ORIGIN}#wipro-swe-author`,
            name: WIPRO_SWE_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#wipro-swe-reviewer`,
            name: WIPRO_SWE_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_SWE_HERO_PATH}#image`,
            url: `${ORIGIN}${WIPRO_SWE_HERO_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_SWE_HERO_PATH}`,
            caption: WIPRO_SWE_HERO_ALT,
            width: WIPRO_SWE_HERO_WIDTH,
            height: WIPRO_SWE_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_SWE_PROCESS_PATH}#image`,
            url: `${ORIGIN}${WIPRO_SWE_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_SWE_PROCESS_PATH}`,
            caption: WIPRO_SWE_PROCESS_ALT,
            width: WIPRO_SWE_PROCESS_WIDTH,
            height: WIPRO_SWE_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(WIPRO_SWE_CANONICAL_PATH),
            url: canonicalUrl(WIPRO_SWE_CANONICAL_PATH),
            name: WIPRO_SWE_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${WIPRO_SWE_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(WIPRO_SWE_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(WIPRO_SWE_CANONICAL_PATH)}#article`,
            headline: WIPRO_SWE_META_TITLE,
            description: WIPRO_SWE_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(WIPRO_SWE_CANONICAL_PATH) },
            url: canonicalUrl(WIPRO_SWE_CANONICAL_PATH),
            datePublished: WIPRO_SWE_PUBLISHED_DATE,
            dateModified: WIPRO_SWE_LAST_UPDATED,
            dateReviewed: WIPRO_SWE_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#wipro-swe-author` },
            reviewedBy: { '@id': `${ORIGIN}#wipro-swe-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${WIPRO_SWE_HERO_PATH}#image` },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: [
                'h1',
                '#wipro-swe-overview',
                '#wipro-swe-hiring-process',
                '#wipro-swe-salary',
                '#wipro-swe-questions',
              ],
            },
          },
        ],
      }
    : null

  const WIPRO_JAVA_PAGE_LD = isWiproJavaHub
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
            '@id': `${ORIGIN}#wipro-java-author`,
            name: WIPRO_JAVA_AUTHOR_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'Person',
            '@id': `${ORIGIN}#wipro-java-reviewer`,
            name: WIPRO_JAVA_REVIEWER_NAME,
            worksFor: { '@id': schemaIds.organization },
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_JAVA_HERO_PATH}#image`,
            url: `${ORIGIN}${WIPRO_JAVA_HERO_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_JAVA_HERO_PATH}`,
            caption: WIPRO_JAVA_HERO_ALT,
            width: WIPRO_JAVA_HERO_WIDTH,
            height: WIPRO_JAVA_HERO_HEIGHT,
          },
          {
            '@type': 'ImageObject',
            '@id': `${ORIGIN}${WIPRO_JAVA_PROCESS_PATH}#image`,
            url: `${ORIGIN}${WIPRO_JAVA_PROCESS_PATH}`,
            contentUrl: `${ORIGIN}${WIPRO_JAVA_PROCESS_PATH}`,
            caption: WIPRO_JAVA_PROCESS_ALT,
            width: WIPRO_JAVA_PROCESS_WIDTH,
            height: WIPRO_JAVA_PROCESS_HEIGHT,
          },
          {
            '@type': 'WebPage',
            '@id': canonicalUrl(WIPRO_JAVA_CANONICAL_PATH),
            url: canonicalUrl(WIPRO_JAVA_CANONICAL_PATH),
            name: WIPRO_JAVA_META_TITLE,
            isPartOf: { '@id': `${ORIGIN}#website` },
            primaryImageOfPage: { '@id': `${ORIGIN}${WIPRO_JAVA_HERO_PATH}#image` },
            mainEntity: { '@id': `${canonicalUrl(WIPRO_JAVA_CANONICAL_PATH)}#article` },
            inLanguage: 'en-IN',
          },
          {
            '@type': 'Article',
            '@id': `${canonicalUrl(WIPRO_JAVA_CANONICAL_PATH)}#article`,
            headline: WIPRO_JAVA_META_TITLE,
            description: WIPRO_JAVA_DESCRIPTION,
            mainEntityOfPage: { '@id': canonicalUrl(WIPRO_JAVA_CANONICAL_PATH) },
            url: canonicalUrl(WIPRO_JAVA_CANONICAL_PATH),
            datePublished: WIPRO_JAVA_PUBLISHED_DATE,
            dateModified: WIPRO_JAVA_LAST_UPDATED,
            dateReviewed: WIPRO_JAVA_REVIEWED_DATE,
            author: { '@id': `${ORIGIN}#wipro-java-author` },
            reviewedBy: { '@id': `${ORIGIN}#wipro-java-reviewer` },
            publisher: { '@id': schemaIds.organization },
            image: { '@id': `${ORIGIN}${WIPRO_JAVA_HERO_PATH}#image` },
            speakable: {
              '@type': 'SpeakableSpecification',
              cssSelector: [
                'h1',
                '#wipro-java-overview',
                '#wipro-java-hiring-process',
                '#wipro-java-salary',
                '#wipro-java-questions',
              ],
            },
          },
        ],
      }
    : null

  const ITEM_LIST_LD =
    isEditorialHub && questions.length > 0
      ? {
          '@context': 'https://schema.org',
          '@type': 'ItemList',
          itemListOrder: 'https://schema.org/ItemListOrderAscending',
          name: isMicrosoftHub
            ? `Top 10 ${company.label} ${role.label} curated interview questions`
            : `${company.label} ${role.label} interview questions`,
          url: canonicalUrl(intersectionQuestionsPath(company.slug, role.slug)),
          numberOfItems: questions.length,
          itemListElement: questions.map((q, idx) => ({
            '@type': 'ListItem',
            position: idx + 1,
            name: q.question,
          })),
        }
      : null

  const linkSections = buildIntersectionPageLinks(company, role)

  return (
    <>
      <JsonLdScript id="intersection-breadcrumb-ld" data={BREADCRUMB_LD} />
      {FAQ_LD ? <JsonLdScript id="intersection-faq-ld" data={FAQ_LD} /> : null}
      {ITEM_LIST_LD ? <JsonLdScript id="intersection-itemlist-ld" data={ITEM_LIST_LD} /> : null}
      {AMAZON_PAGE_LD ? <JsonLdScript id="intersection-amazon-page-ld" data={AMAZON_PAGE_LD} /> : null}
      {MICROSOFT_PAGE_LD ? <JsonLdScript id="intersection-microsoft-page-ld" data={MICROSOFT_PAGE_LD} /> : null}
      {INFOSYS_JAVA_PAGE_LD ? <JsonLdScript id="intersection-infosys-java-page-ld" data={INFOSYS_JAVA_PAGE_LD} /> : null}
      {INFOSYS_SE_PAGE_LD ? <JsonLdScript id="intersection-infosys-se-page-ld" data={INFOSYS_SE_PAGE_LD} /> : null}
      {FRESHWORKS_FE_PAGE_LD ? <JsonLdScript id="intersection-freshworks-fe-page-ld" data={FRESHWORKS_FE_PAGE_LD} /> : null}
      {WIPRO_DA_PAGE_LD ? <JsonLdScript id="intersection-wipro-da-page-ld" data={WIPRO_DA_PAGE_LD} /> : null}
      {WIPRO_QA_PAGE_LD ? <JsonLdScript id="intersection-wipro-qa-page-ld" data={WIPRO_QA_PAGE_LD} /> : null}
      {WIPRO_SWE_PAGE_LD ? <JsonLdScript id="intersection-wipro-swe-page-ld" data={WIPRO_SWE_PAGE_LD} /> : null}
      {WIPRO_JAVA_PAGE_LD ? <JsonLdScript id="intersection-wipro-java-page-ld" data={WIPRO_JAVA_PAGE_LD} /> : null}

      {isAmazonHub ? (
        <AmazonSeHubArticle company={company} role={role} questions={questions} />
      ) : isMicrosoftHub ? (
        <MicrosoftSeHubArticle company={company} role={role} questions={questions} />
      ) : isInfosysSeHub ? (
        <InfosysSeHubArticle company={company} role={role} questions={questions} />
      ) : isInfosysJavaHub ? (
        <InfosysJavaHubArticle company={company} role={role} questions={questions} />
      ) : isFreshworksFeHubPage ? (
        <FreshworksFeHubArticle company={company} role={role} questions={questions} />
      ) : isWiproDaHub ? (
        <WiproDaHubArticle company={company} role={role} questions={questions} />
      ) : isWiproQaHub ? (
        <WiproQaHubArticle company={company} role={role} questions={questions} />
      ) : isWiproSweHub ? (
        <WiproSweHubArticle company={company} role={role} questions={questions} />
      ) : isWiproJavaHub ? (
        <WiproJavaHubArticle company={company} role={role} questions={questions} />
      ) : (
        <>
          <section
            className={`${CONTENT_SECTION} border-b`}
            style={{ borderColor: 'var(--card-border)' }}
          >
            <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
              <nav className="mb-4 flex items-center gap-1 text-xs" style={{ color: 'var(--text-muted)' }} aria-label="Breadcrumb">
                <Link href={questionsHubPath()} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                  Interview Questions
                </Link>
                <span aria-hidden>›</span>
                <Link href={companyQuestionsPath(company.slug)} className="hover:underline" style={{ color: 'var(--text-muted)' }}>
                  {company.label}
                </Link>
                <span aria-hidden>›</span>
                <span>{role.shortLabel}</span>
              </nav>

              <p className="text-xs font-bold uppercase tracking-[0.14em] sm:text-sm" style={{ color: 'var(--accent-primary)' }}>
                {company.label} · {role.category}
              </p>
              <h1 className="mt-3 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-balance sm:text-4xl" style={{ color: 'var(--text-primary)' }}>
                {company.label} {role.label} Interview Questions 2026
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-relaxed sm:text-lg" style={{ color: 'var(--text-secondary)' }}>
                Preparation guide for {role.label} positions at {company.fullName}. Covers their{' '}
                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>{company.interviewStyle}</span>{' '}
                process with technical, behavioral, and HR questions.
              </p>

              <dl
                className="mt-7 grid gap-4 rounded-xl border p-5 sm:grid-cols-3"
                style={{
                  borderColor: 'var(--card-border)',
                  background: 'color-mix(in srgb, var(--card-bg) 80%, transparent)',
                }}
              >
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Interview rounds</dt>
                  <dd className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{company.typicalRounds}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Avg. package</dt>
                  <dd className="mt-1 text-base font-semibold" style={{ color: 'var(--text-primary)' }}>{company.avgPackageRange}</dd>
                </div>
                <div>
                  <dt className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Role type</dt>
                  <dd className="mt-1 text-base font-semibold capitalize" style={{ color: 'var(--text-primary)' }}>{role.category}</dd>
                </div>
              </dl>
            </div>
          </section>

          <section className={CONTENT_SECTION}>
            <div className={`${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
              <QuestionsList questions={questions} heading={`${company.label} ${role.label} Interview Questions`} />
            </div>
          </section>
        </>
      )}

      <section
        className={isEditorialHub ? 'border-y py-8 md:py-12' : `${CONTENT_SECTION} border-y`}
        style={{
          borderColor: 'var(--card-border)',
          background: 'color-mix(in srgb, var(--accent-primary) 6%, transparent)',
        }}
      >
        <div className={isEditorialHub ? HUB_SHELL_CLASS : `${LANDING_PAGE_CONTAINER} px-4 sm:px-5`}>
          <div className={isEditorialHub ? 'ie-blog-interview-anxiety-content' : undefined}>
            <h2 className="max-w-xl text-xl font-bold tracking-tight sm:text-2xl" style={{ color: 'var(--text-primary)' }}>
              Practice answering, not just reading
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Take a full scored mock interview tailored to your resume. Get feedback on technical depth, clarity,
              structure, confidence, and relevance — free to start.
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
                href="/tools/question-generator"
                className="inline-flex items-center justify-center rounded-full border px-6 py-2.5 text-sm font-semibold transition-colors hover:border-(--accent-primary)"
                style={{ borderColor: 'var(--card-border)', color: 'var(--text-secondary)' }}
              >
                Free question generator
              </Link>
            </div>
          </div>
        </div>
      </section>

      <RelatedGuidesSection path={intersectionQuestionsPath(company.slug, role.slug)} />

      {linkSections.map((section) => (
        <SeoCrossLinksSection
          key={section.heading}
          heading={section.heading}
          links={section.links}
        />
      ))}
    </>
  )
}
