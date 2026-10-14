export type ContentCategory =
  | 'Career'
  | 'Placement'
  | 'DSA'
  | 'Software Engineering'
  | 'Frontend'
  | 'Android'
  | 'Java'
  | 'Behavioral'
  | 'HR'
  | 'Interview Strategy'

export type ContentCluster =
  | 'Placement Preparation'
  | 'DSA & Coding'
  | 'Software Engineering'
  | 'Frontend Development'
  | 'Android Development'
  | 'Java Development'
  | 'Company Interview Guides'
  | 'Behavioral & HR Interviews'

export type ContentType =
  | 'blog'
  | 'prep-guide'
  | 'role-hub'
  | 'company-role-hub'
  | 'company-hub'
  | 'skill-hub'
  | 'questions-hub'
  | 'resource-index'

export type ContentConceptLink = {
  label: string
  href: string
}

export type ContentLearnNextLink = {
  label: string
  href: string
  description?: string
}

export type ContentToolLink = {
  label: string
  href: string
  description?: string
}

export type ContentEntry = {
  id: string
  path: string
  title: string
  description: string
  category: ContentCategory
  cluster: ContentCluster
  type: ContentType
  readTime?: string
  lastModified: string
  featured?: boolean
  popular?: boolean
  tags: readonly string[]
  /** Contextual concept chips — interview types, skills, formats. */
  relatedConcepts?: readonly ContentConceptLink[]
  /** Ordered learning path from this page. */
  learnNext?: readonly ContentLearnNextLink[]
  /** InterviewEra tools to recommend on this page. */
  recommendedTools?: readonly ContentToolLink[]
}

export const CONTENT_CATEGORIES: readonly ContentCategory[] = [
  'Career',
  'Placement',
  'DSA',
  'Software Engineering',
  'Frontend',
  'Android',
  'Java',
  'Behavioral',
  'HR',
  'Interview Strategy',
] as const

export const CONTENT_CLUSTERS: readonly ContentCluster[] = [
  'Placement Preparation',
  'DSA & Coding',
  'Software Engineering',
  'Frontend Development',
  'Android Development',
  'Java Development',
  'Company Interview Guides',
  'Behavioral & HR Interviews',
] as const
