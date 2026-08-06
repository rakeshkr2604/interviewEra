/**
 * InterviewEra Blog Design System — shared types for premium editorial layout.
 * Reusable across all blog articles (not article-specific).
 */

export type BlogTocSection = {
  id: string
  label: string
}

export type BlogHeroBadge = {
  label: string
  tone?: 'neutral' | 'accent' | 'success' | 'warning' | 'info'
}

export type BlogRelatedCard = {
  href: string
  title: string
  description: string
  category?: string
  readTime?: string
  imageSrc?: string
  imageAlt?: string
}

export type BlogNavLink = {
  href: string
  title: string
  label?: string
}

export type BlogTimelineStep = {
  title: string
  description?: string
}

export type BlogCalloutVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'tip'
  | 'recruiter'
  | 'interview'
  | 'editorial'

export type BlogChecklistItem = {
  id: string
  label: string
}
