/**
 * JSON-LD builders — return plain objects for `JSON.stringify` in `<script type="application/ld+json">`.
 * Keep `@id` / `url` aligned with `canonicalUrl()` + `siteConfig.url`.
 */

export interface BreadcrumbItemInput {
  name: string;
  path: string;
}

export function breadcrumbListJsonLd(items: BreadcrumbItemInput[], origin: string): Record<string, unknown> {
  const listElements = items.map((item, index) => ({
    '@type': 'ListItem' as const,
    position: index + 1,
    name: item.name,
    item: `${origin.replace(/\/$/, '')}${item.path.startsWith('/') ? item.path : `/${item.path}`}`,
  }));

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
}

export function articleJsonLd(input: ArticleJsonLdInput): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: input.headline,
    description: input.description,
    mainEntityOfPage: { '@type': 'WebPage', '@id': input.canonicalUrl },
    url: input.canonicalUrl,
    datePublished: input.datePublished,
    dateModified: input.dateModified ?? input.datePublished,
    author: { '@type': 'Person', name: input.authorName },
    publisher: { '@id': input.publisherId },
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
