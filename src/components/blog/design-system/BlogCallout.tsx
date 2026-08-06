import {
  AlertTriangle,
  CheckCircle2,
  Info,
  Lightbulb,
  MessageSquareQuote,
  Sparkles,
  UserRound,
} from 'lucide-react'
import type { ReactNode } from 'react'
import type { BlogCalloutVariant } from '@/components/blog/design-system/types'
import { cn } from '@/lib/utils'

const VARIANT_META: Record<
  BlogCalloutVariant,
  { label: string; icon: typeof Info; className: string }
> = {
  info: { label: 'Info', icon: Info, className: 'ie-blog-ds-callout--info' },
  success: { label: 'Success', icon: CheckCircle2, className: 'ie-blog-ds-callout--success' },
  warning: { label: 'Warning', icon: AlertTriangle, className: 'ie-blog-ds-callout--warning' },
  tip: { label: 'Purple Tip', icon: Lightbulb, className: 'ie-blog-ds-callout--tip' },
  recruiter: { label: 'Recruiter Note', icon: UserRound, className: 'ie-blog-ds-callout--recruiter' },
  interview: { label: 'Interview Insight', icon: MessageSquareQuote, className: 'ie-blog-ds-callout--interview' },
  editorial: { label: 'Editorial Note', icon: Sparkles, className: 'ie-blog-ds-callout--editorial' },
}

type BlogCalloutProps = {
  variant?: BlogCalloutVariant
  title?: string
  children: ReactNode
  className?: string
}

export function BlogCallout({
  variant = 'info',
  title,
  children,
  className,
}: BlogCalloutProps) {
  const meta = VARIANT_META[variant]
  const Icon = meta.icon
  const heading = title ?? meta.label

  return (
    <aside className={cn('ie-blog-ds-callout', meta.className, className)} aria-label={heading}>
      <div className="ie-blog-ds-callout__icon" aria-hidden>
        <Icon className="size-4" />
      </div>
      <div className="ie-blog-ds-callout__body">
        <p className="ie-blog-ds-callout__title">{heading}</p>
        <div className="ie-blog-ds-callout__content">{children}</div>
      </div>
    </aside>
  )
}
