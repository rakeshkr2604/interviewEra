import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { BlogStartFreeCta } from '@/components/analytics/BlogStartFreeCta'

type BlogProductCtaProps = {
  eyebrow?: string
  title: string
  body: string
  primaryHref?: string
  primaryLabel?: string
  secondaryHref?: string
  secondaryLabel?: string
  section?: string
}

/**
 * Reusable product CTA for editorial articles.
 * Prefer tracked primary CTA via BlogStartFreeCta; secondary stays a plain Link.
 */
export function BlogProductCta({
  eyebrow = 'InterviewEra',
  title,
  body,
  primaryHref = '/signup',
  primaryLabel = 'Start Free Mock Interview',
  secondaryHref = '/tools/ats-checker',
  secondaryLabel = 'Check your resume',
  section = 'blog_product_cta',
}: BlogProductCtaProps) {
  return (
    <section className="ie-blog-ds-cta" aria-labelledby="blog-ds-cta-title">
      <p className="ie-blog-ds-cta__eyebrow">{eyebrow}</p>
      <h2 id="blog-ds-cta-title" className="ie-blog-ds-cta__title">
        {title}
      </h2>
      <p className="ie-blog-ds-cta__body">{body}</p>
      <div className="ie-blog-ds-cta__actions">
        <BlogStartFreeCta
          href={primaryHref}
          section={section}
          ctaText={primaryLabel}
          className="landing-cta-lift inline-flex h-11 items-center justify-center gap-2 rounded-[12px] px-6 text-sm font-semibold text-white sm:h-12 sm:px-8 sm:text-base"
          style={{
            background: 'linear-gradient(135deg, var(--accent-primary), #6d28d9)',
            boxShadow: '0 12px 36px color-mix(in srgb, var(--accent-primary) 30%, transparent)',
          }}
        >
          {primaryLabel}
          <ArrowRight className="size-4" aria-hidden />
        </BlogStartFreeCta>
        {secondaryHref && secondaryLabel ? (
          <Link href={secondaryHref} className="ie-blog-ds-cta__secondary">
            {secondaryLabel}
          </Link>
        ) : null}
      </div>
      <div className="ie-blog-ds-cta__art" aria-hidden>
        <span />
        <span />
        <span />
      </div>
    </section>
  )
}
