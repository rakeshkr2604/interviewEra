import {
  BRAND_ICON_192_PATH,
  schemaIds,
  siteConfig,
  siteOrganizationStructured,
} from '@/lib/seo/metadata'

const logoUrl = `${siteConfig.url}${BRAND_ICON_192_PATH}`

export function StructuredData() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': schemaIds.organization,
        name: siteConfig.name,
        url: siteConfig.url,
        logo: {
          '@type': 'ImageObject',
          '@id': schemaIds.logo,
          url: logoUrl,
          contentUrl: logoUrl,
          width: 192,
          height: 192,
        },
        brand: {
          '@type': 'Brand',
          name: siteConfig.name,
          logo: { '@id': schemaIds.logo },
        },
        sameAs: [...siteOrganizationStructured.sameAs],
        founder: { '@id': schemaIds.founder },
        employee: [{ '@id': schemaIds.founder }],
      },
      {
        '@type': 'Person',
        '@id': schemaIds.founder,
        name: siteOrganizationStructured.founder.name,
        jobTitle: siteOrganizationStructured.founder.jobTitle,
        sameAs: [...siteOrganizationStructured.founder.sameAs],
        worksFor: { '@id': schemaIds.organization },
      },
      {
        '@type': 'WebSite',
        '@id': `${siteConfig.url}#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.defaultDescription,
        inLanguage: 'en-IN',
        publisher: { '@id': schemaIds.organization },
      },
      {
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        applicationCategory: 'EducationalApplication',
        operatingSystem: 'Web',
        description: siteConfig.defaultDescription,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'INR',
        },
        provider: { '@id': schemaIds.organization },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
