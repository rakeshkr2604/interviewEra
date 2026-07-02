"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { trackDurablePageView } from "@/lib/analytics/page-view";

/**
 * Sends GA4 page_view + durable product_events on App Router client navigations.
 * Initial load is covered by the first effect run after gtag init.
 */
export function GoogleAnalyticsPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    const query = searchParams.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    trackDurablePageView(url);
  }, [pathname, searchParams]);

  return null;
}
