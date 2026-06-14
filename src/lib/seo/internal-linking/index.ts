/**
 * Internal linking engine — public barrel.
 *
 * Usage in page templates:
 *   import { buildRolePageLinks } from '@/lib/seo/internal-linking'
 *
 *   const sections = buildRolePageLinks(role)
 *   // render: sections.map(s => <SeoCrossLinksSection heading={s.heading} links={s.links} />)
 */

export type { LinkSection } from './engine'

export {
  buildRoleSkillLinks,
  buildRolePageLinks,
  buildCompanyPageLinks,
  buildSkillPageLinks,
  buildIntersectionPageLinks,
  buildToolQGenRoleLinks,
  buildToolQGenCompanyLinks,
  buildToolAtsRoleLinks,
  buildToolStarTopicLinks,
  buildStarBuilderLandingLinks,
} from './engine'
