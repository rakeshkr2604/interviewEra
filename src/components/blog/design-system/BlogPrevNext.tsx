import Link from 'next/link'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import type { BlogNavLink } from '@/components/blog/design-system/types'

type BlogPrevNextProps = {
  previous?: BlogNavLink | null
  next?: BlogNavLink | null
}

export function BlogPrevNext({ previous, next }: BlogPrevNextProps) {
  if (!previous && !next) return null

  return (
    <nav className="ie-blog-ds-prevnext" aria-label="Article navigation">
      {previous ? (
        <Link href={previous.href} className="ie-blog-ds-prevnext__card ie-blog-ds-prevnext__card--prev">
          <span className="ie-blog-ds-prevnext__eyebrow">
            <ArrowLeft className="size-3.5" aria-hidden />
            {previous.label ?? 'Previous'}
          </span>
          <span className="ie-blog-ds-prevnext__title">{previous.title}</span>
        </Link>
      ) : (
        <span />
      )}
      {next ? (
        <Link href={next.href} className="ie-blog-ds-prevnext__card ie-blog-ds-prevnext__card--next">
          <span className="ie-blog-ds-prevnext__eyebrow">
            {next.label ?? 'Next'}
            <ArrowRight className="size-3.5" aria-hidden />
          </span>
          <span className="ie-blog-ds-prevnext__title">{next.title}</span>
        </Link>
      ) : null}
    </nav>
  )
}
