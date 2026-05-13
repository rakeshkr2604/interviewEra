import { SeoCrossLinksSection } from '@/components/seo/SeoCrossLinksSection';
import { BLOG_TOOL_LINKS } from '@/lib/seo/internal-links';

export function BlogRelatedToolsStrip() {
  return (
    <SeoCrossLinksSection
      heading="Free tools & plans"
      links={BLOG_TOOL_LINKS}
    />
  );
}
