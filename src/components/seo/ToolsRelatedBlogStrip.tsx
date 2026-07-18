import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { TOOL_PAGE_BLOG_LINKS } from '@/lib/seo/internal-links';

export function ToolsRelatedBlogStrip() {
  return (
    <SeoCrossLinksSection
      heading="Related reading"
      links={TOOL_PAGE_BLOG_LINKS}
      // Keep default border-t; only tighten vertical padding so gap stays ~8–10px
      className="pt-2 pb-10 sm:pt-2.5 sm:pb-12"
    />
  );
}
