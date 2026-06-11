import {
  ROLES,
  COMPANIES,
  SKILLS,
  roleQuestionsPath,
  companyQuestionsPath,
  skillQuestionsPath,
} from '@/lib/seo/programmatic'
import {
  getRoleQuestionsLastUpdated,
  getCompanyQuestionsLastUpdated,
  getSkillQuestionsLastUpdated,
} from '@/lib/seo/programmatic/questions'
import {
  isRoleIndexable,
  isCompanyIndexable,
  isSkillIndexable,
} from '@/lib/seo/programmatic/indexing'
import { EDITORIAL_CONTENT_ENTRIES } from '@/lib/seo/content/entries'
import type { ContentCategory, ContentCluster, ContentEntry, ContentType } from '@/lib/seo/content/types'
import { CONTENT_CLUSTERS } from '@/lib/seo/content/types'
import type { Role } from '@/lib/seo/programmatic/roles'

const EDITORIAL_PATHS = new Set(EDITORIAL_CONTENT_ENTRIES.map((e) => e.path))

function roleCategory(role: Role): ContentCategory {
  if (role.slug === 'android-developer') return 'Android'
  if (role.slug === 'java-developer') return 'Java'
  if (role.slug === 'frontend-developer') return 'Frontend'
  return 'Software Engineering'
}

function roleCluster(role: Role): ContentCluster {
  if (role.slug === 'android-developer') return 'Android Development'
  if (role.slug === 'java-developer') return 'Java Development'
  if (role.slug === 'frontend-developer') return 'Frontend Development'
  return 'Software Engineering'
}

function buildProgrammaticRoleEntries(): ContentEntry[] {
  return ROLES.filter(isRoleIndexable)
    .filter((role) => !EDITORIAL_PATHS.has(roleQuestionsPath(role.slug)))
    .map((role) => ({
      id: `role-${role.slug}`,
      path: roleQuestionsPath(role.slug),
      title: `${role.label} Interview Questions`,
      description: role.description,
      category: roleCategory(role),
      cluster: roleCluster(role),
      type: 'role-hub' as ContentType,
      lastModified: getRoleQuestionsLastUpdated(role.slug, '2026-05-21'),
      tags: [role.slug, ...role.primarySkills] as readonly string[],
    }))
}

function buildProgrammaticCompanyEntries(): ContentEntry[] {
  return COMPANIES.filter(isCompanyIndexable)
    .filter((company) => !EDITORIAL_PATHS.has(companyQuestionsPath(company.slug)))
    .map((company) => ({
    id: `company-${company.slug}`,
    path: companyQuestionsPath(company.slug),
    title: `${company.label} Interview Questions`,
    description: `${company.fullName} interview questions — ${company.interviewStyle}.`,
    category: 'Software Engineering' as ContentCategory,
    cluster: 'Company Interview Guides' as ContentCluster,
    type: 'company-hub' as ContentType,
    lastModified: getCompanyQuestionsLastUpdated(company.slug, '2026-05-21'),
    tags: [company.slug, company.tier] as readonly string[],
  }))
}

function buildProgrammaticSkillEntries(): ContentEntry[] {
  return SKILLS.filter(isSkillIndexable).map((skill) => ({
    id: `skill-${skill.slug}`,
    path: skillQuestionsPath(skill.slug),
    title: `${skill.label} Interview Questions`,
    description: skill.description,
    category: 'Software Engineering' as ContentCategory,
    cluster: 'Software Engineering' as ContentCluster,
    type: 'skill-hub' as ContentType,
    lastModified: getSkillQuestionsLastUpdated(skill.slug, '2026-05-21'),
    tags: [skill.slug, ...skill.relatedRoles] as readonly string[],
  }))
}

let cachedAll: ContentEntry[] | null = null

/** Full discoverable content index — editorial + indexable programmatic pages. */
export function getAllContentEntries(): ContentEntry[] {
  if (cachedAll) return cachedAll
  cachedAll = [
    ...EDITORIAL_CONTENT_ENTRIES,
    ...buildProgrammaticRoleEntries(),
    ...buildProgrammaticCompanyEntries(),
    ...buildProgrammaticSkillEntries(),
  ]
  return cachedAll
}

export function getBlogContentEntries(): ContentEntry[] {
  return getAllContentEntries().filter((e) => e.type === 'blog')
}

export function getFeaturedContentEntries(): ContentEntry[] {
  return getAllContentEntries().filter((e) => e.featured)
}

export function getPopularContentEntries(): ContentEntry[] {
  return getAllContentEntries().filter((e) => e.popular)
}

export function getContentByPath(path: string): ContentEntry | undefined {
  return getAllContentEntries().find((e) => e.path === path)
}

export function getContentByCluster(cluster: ContentCluster): ContentEntry[] {
  return getAllContentEntries().filter((e) => e.cluster === cluster)
}

export function getContentByCategory(category: ContentCategory): ContentEntry[] {
  return getAllContentEntries().filter((e) => e.category === category)
}

export function getRecentlyUpdatedContent(limit = 8): ContentEntry[] {
  return [...getAllContentEntries()]
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, limit)
}

export function getLatestBlogContent(limit = 10): ContentEntry[] {
  return [...getBlogContentEntries()]
    .sort((a, b) => b.lastModified.localeCompare(a.lastModified))
    .slice(0, limit)
}

export function getResourceClusterLinks(): { cluster: ContentCluster; entries: ContentEntry[] }[] {
  const clusters = new Map<ContentCluster, ContentEntry[]>()

  for (const entry of getAllContentEntries()) {
    if (entry.type === 'resource-index' || entry.type === 'questions-hub') continue
    const list = clusters.get(entry.cluster) ?? []
    list.push(entry)
    clusters.set(entry.cluster, list)
  }

  return CONTENT_CLUSTERS.filter((cluster) => clusters.has(cluster)).map((cluster) => ({
    cluster,
    entries: (clusters.get(cluster) ?? []).sort((a, b) => a.title.localeCompare(b.title)),
  }))
}

export function countDiscoverableContent(): number {
  return getAllContentEntries().length
}
