import MarketingLayout from '@/app/(marketing)/layout';
import LandingHomeClient from '@/components/landing/LandingHomeClient';
import { PAGE_SEO } from '@/lib/seo/metadata';

export const metadata = PAGE_SEO.home;
/** ISR for public homepage shell (stats + auth resolve on client). */
export const revalidate = 3600;

export default function Page() {
  return (
    <MarketingLayout>
      <LandingHomeClient />
    </MarketingLayout>
  );
}
