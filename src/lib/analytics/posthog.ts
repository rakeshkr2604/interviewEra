type PostHogLike = {
  init: (key: string, options: Record<string, unknown>) => void;
  capture: (eventName: string, properties?: Record<string, unknown>) => void;
  getFeatureFlag: (key: string) => string | boolean | undefined;
};

let posthogClient: PostHogLike | null = null;
let posthogLoadPromise: Promise<PostHogLike | null> | null = null;

async function loadPostHog(): Promise<PostHogLike | null> {
  if (posthogClient) return posthogClient;
  if (posthogLoadPromise) return posthogLoadPromise;

  posthogLoadPromise = import('posthog-js')
    .then((mod) => {
      posthogClient = mod.default as unknown as PostHogLike;
      return posthogClient;
    })
    .catch(() => null);

  return posthogLoadPromise;
}

export function initPostHog(): void {
  if (typeof window === 'undefined') return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;

  void loadPostHog().then((client) => {
    if (!client) return;
    client.init(key, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://app.posthog.com',
      capture_pageview: true,
      autocapture: false,
      persistence: 'localStorage+cookie',
    });
  });
}

export const posthog = {
  capture(eventName: string, properties?: Record<string, unknown>) {
    posthogClient?.capture(eventName, properties);
  },
  getFeatureFlag(key: string) {
    return posthogClient?.getFeatureFlag(key);
  },
};
