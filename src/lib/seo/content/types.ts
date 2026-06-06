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
  | 'role-hub'
  | 'company-role-hub'
  | 'company-hub'
  | 'skill-hub'
  | 'questions-hub'
  | 'resource-index'

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
