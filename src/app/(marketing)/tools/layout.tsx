import type { ReactNode } from 'react';

/** Tool pages define their own `metadata.title` (root `title.template` adds the brand). */

/** Explicit segment layout so `/tools/*` always resolves under marketing. */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return children;
}
