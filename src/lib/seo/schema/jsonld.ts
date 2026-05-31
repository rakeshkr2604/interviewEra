/**
 * JSON-LD builders — return plain objects for `JSON.stringify` in `<script type="application/ld+json">`.
 * Keep `@id` / `url` aligned with `canonicalUrl()` + `siteConfig.url`.
 */
import { isValidSeoPath } from '@/lib/seo/url-safety';

export interface BreadcrumbItemInput {
  name: string;
  path: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbItemInput[], origin: string): Record<string, unknown> {
  const base = origin.replace(/\/$/, '');
  let position = 0;
  const listElements = items
    .filter((item) => isValidSeoPath(item.path.startsWith('/') ? item.path : `/${item.path}`))
    .map((item) => {
      position += 1;
      const path = item.path.startsWith('/') ? item.path : `/${item.path}`;
      return {
        '@type': 'ListItem' as const,
        position,
        name: item.name,
        item: `${base}${path}`,
      };
    });

  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: listElements,
  };
}

export interface FaqPairInput {
  question: string;
  answer: string;
}

export function faqPageJsonLd(faqs: FaqPairInput[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export interface ArticleJsonLdInput {
  headline: string;
  description: string;
  canonicalUrl: string;
  datePublished: string;
  dateModified?: string;
  authorName: string;
  /** Organization `@id` URI (e.g. `${origin}#organization`) */
  publisherId: string;
  /** Hero or OG image absolute URL for BlogPosting `image` */
  imageUrl?: string;
}

export function articleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.canonicalUrl },
    url: input.canonicalUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@id': input.publisherId },
    ...(input.imageUrl ? { image: input.imageUrl } : {}),
  };
}

export interface WebApplicationJsonLdInput {
  name: string;
  description: string;
  url: string;
  /** e.g. "Free" or price string like "0" */
  price?: string;
  priceCurrency?: string;
  /** Organization `@id` URI */
  providerId: string;
}

export function webApplicationJsonLd(input: WebApplicationJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: input.name,
    description: input.description,
    url: input.url,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Web',
    isAccessibleForFree: true,
    offers: {
      '@type': 'Offer',
      price: input.price ?? '0',
      priceCurrency: input.priceCurrency ?? 'INR',
    },
    provider: { '@id': input.providerId },
  };
}

export interface HowToStep {
  name: string;
  text: string;
}

export function howToJsonLd(
  name: string,
  description: string,
  steps: HowToStep[],
): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name,
    description,
    step: steps.map((s, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: s.name,
      text: s.text,
    })),
  };
}
