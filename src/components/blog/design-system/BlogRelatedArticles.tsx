import Image from 'next/image'
import Link from 'next/link'
import type { BlogRelatedCard } from '@/components/blog/design-system/types'

type BlogRelatedArticlesProps = {
  title?: string
  items: readonly BlogRelatedCard[]
}

export function BlogRelatedArticles({
  title = 'Related articles',
  items,
}: BlogRelatedArticlesProps) {
  if (!items.length) return null

  return (
    <section className="ie-blog-ds-related" aria-labelledby="blog-ds-related-title">
      <h2 id="blog-ds-related-title" className="ie-blog-ds-related__heading">
        {title}
      </h2>
      <ul className="ie-blog-ds-related__grid">
        {items.map((item) => (
          <li key={item.href}>
            <Link href={item.href} className="ie-blog-ds-related__card">
              {item.imageSrc ? (
                <span className="ie-blog-ds-related__media">
                  <Image
                    src={item.imageSrc}
                    alt={item.imageAlt ?? ''}
                    fill
                    loading="lazy"
                    sizes="(max-width: 768px) 100vw, 320px"
                    className="object-cover"
                  />
                </span>
              ) : null}
              <span className="ie-blog-ds-related__meta">
                {item.category ? <span>{item.category}</span> : null}
                {item.category && item.readTime ? <span aria-hidden>·</span> : null}
                {item.readTime ? <span>{item.readTime}</span> : null}
              </span>
              <span className="ie-blog-ds-related__title">{item.title}</span>
              <span className="ie-blog-ds-related__desc">{item.description}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
