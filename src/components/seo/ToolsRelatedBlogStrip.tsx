import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { TOOL_PAGE_BLOG_LINKS } from '@/lib/seo/internal-links';

export function ToolsRelatedBlogStrip() {
  return (
    <SeoCrossLinksSection
      heading="Related reading"
      links={TOOL_PAGE_BLOG_LINKS}
    />
  );
}
