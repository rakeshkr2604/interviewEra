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
        alternateName: [...siteConfig.alternateNames],
        legalName: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.entityDefinition,
        slogan: siteConfig.slogan,
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
          alternateName: [...siteConfig.alternateNames],
          logo: { '@id': schemaIds.logo },
        },
        knowsAbout: [...siteOrganizationStructured.knowsAbout],
        areaServed: {
          '@type': 'Country',
          name: siteOrganizationStructured.areaServed,
        },
        address: {
          '@type': 'PostalAddress',
          addressLocality: siteOrganizationStructured.address.locality,
          addressRegion: siteOrganizationStructured.address.region,
          addressCountry: siteOrganizationStructured.address.country,
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
        alternateName: [...siteConfig.alternateNames],
        url: siteConfig.url,
        description: siteConfig.entityDefinition,
        inLanguage: 'en-IN',
        publisher: { '@id': schemaIds.organization },
        about: { '@id': schemaIds.organization },
      },
      {
        '@type': 'SoftwareApplication',
        name: siteConfig.name,
        alternateName: [...siteConfig.alternateNames],
        applicationCategory: 'EducationalApplication',
        applicationSubCategory: 'Interview Preparation',
        operatingSystem: 'Web',
        url: siteConfig.url,
        description: siteConfig.entityDefinition,
        featureList: [...siteOrganizationStructured.knowsAbout],
        isAccessibleForFree: true,
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
