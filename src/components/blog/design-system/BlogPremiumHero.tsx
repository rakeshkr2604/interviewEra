import Image from 'next/image'
import Link from 'next/link'
import type { ReactNode } from 'react'
import type { BlogHeroBadge } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

type BlogPremiumHeroProps = {
  breadcrumbs?: readonly { label: string; href?: string }[]
  category: string
  title: string
  description?: string
  readTime: string
  updatedLabel: string
  author?: string
  badges?: readonly BlogHeroBadge[]
  tags?: readonly string[]
  heroSrc: string
  heroAlt: string
  summary?: ReactNode
  shareSlot?: ReactNode
}

const BADGE_TONE: Record<NonNullable<BlogHeroBadge['tone']>, string> = {
  neutral: 'ie-blog-ds-badge--neutral',
  accent: 'ie-blog-ds-badge--accent',
  success: 'ie-blog-ds-badge--success',
  warning: 'ie-blog-ds-badge--warning',
  info: 'ie-blog-ds-badge--info',
}

export function BlogPremiumHero({
  breadcrumbs,
  category,
  title,
  description,
  readTime,
  updatedLabel,
  author = 'InterviewEra Editorial',
  badges,
  tags,
  heroSrc,
  heroAlt,
  summary,
  shareSlot,
}: BlogPremiumHeroProps) {
  return (
    <header className="ie-blog-ds-hero">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav className="ie-blog-ds-hero__crumbs" aria-label="Breadcrumb">
          <ol>
            {breadcrumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`}>
                {crumb.href ? (
                  <Link href={crumb.href} className="ie-blog-inline-link">
                    {crumb.label}
                  </Link>
                ) : (
                  <span aria-current="page">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <p className="ie-blog-ds-hero__category">{category}</p>
      <h1 className="ie-blog-ds-hero__title">{title}</h1>
      {description ? <p className="ie-blog-ds-hero__deck">{description}</p> : null}

      <div className="ie-blog-ds-hero__meta">
        <span>{author}</span>
        <span aria-hidden>·</span>
        <span>{readTime}</span>
        <span aria-hidden>·</span>
        <span>{updatedLabel}</span>
      </div>

      {badges && badges.length > 0 ? (
        <ul className="ie-blog-ds-hero__badges" aria-label="Article badges">
          {badges.map((badge) => (
            <li
              key={badge.label}
              className={cn('ie-blog-ds-badge', BADGE_TONE[badge.tone ?? 'neutral'])}
            >
              {badge.label}
            </li>
          ))}
        </ul>
      ) : null}

      {shareSlot}

      <div className="ie-blog-ds-hero__media">
        <Image
          src={heroSrc}
          alt={heroAlt}
          fill
          priority
          sizes="(max-width: 768px) 100vw, 900px"
          className="object-cover"
        />
      </div>

      {summary ? <div className="ie-blog-ds-hero__summary">{summary}</div> : null}

      {tags && tags.length > 0 ? (
        <ul className="ie-blog-ds-hero__tags" aria-label="Tags">
          {tags.map((tag) => (
            <li key={tag}>{tag}</li>
          ))}
        </ul>
      ) : null}
    </header>
  )
}
