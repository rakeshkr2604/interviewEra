import type { ReactNode } from 'react';

/** Explicit segment layout so `/tools/*` always resolves under marketing. */
export default function ToolsLayout({ children }: { children: ReactNode }) {
  return children;
}
