"use client";

import { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { trackFunnelEvent } from "@/lib/analytics/funnel";

const FUNNEL_PARAM = "funnel";
const SOURCE_PARAM = "funnel_source";

/**
 * Fires one-shot funnel events encoded in the URL (e.g. OAuth signup_completed).
 * Server routes set query params; this component emits GA4 and strips them to
 * avoid duplicate fires on refresh.
 */
export function FunnelQueryCapture() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const event = searchParams.get(FUNNEL_PARAM);
    if (!event || event !== "signup_completed") return;

    const source = searchParams.get(SOURCE_PARAM) ?? "oauth";
    const dedupeKey = `${event}:${source}:${pathname}`;
    if (handledRef.current === dedupeKey) return;
    handledRef.current = dedupeKey;

    void (async () => {
      let userId: string | undefined;
      try {
        const { createClient } = await import("@/lib/supabase/client");
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        userId = user?.id;
      } catch {
        /* best-effort */
      }

      trackFunnelEvent(
        "signup_completed",
        { userId, source, method: "oauth" },
        { product: false },
      );

      const next = new URLSearchParams(searchParams.toString());
      next.delete(FUNNEL_PARAM);
      next.delete(SOURCE_PARAM);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    })();
  }, [pathname, router, searchParams]);

  return null;
}
