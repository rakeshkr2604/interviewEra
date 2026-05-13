'use client';

import { useCallback, useRef, useState, type CSSProperties } from 'react';

type CopyBadgeShareLinkButtonProps = {
  url: string;
  className?: string;
  style?: CSSProperties;
};

/** Copies the public badges share URL; canonical page is often the current route, so navigation feels broken. */
export function CopyBadgeShareLinkButton({
  url,
  className,
  style,
}: CopyBadgeShareLinkButtonProps) {
  const [label, setLabel] = useState('Copy page link');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const onCopy = useCallback(async () => {
    if (timeoutRef.current !== undefined) clearTimeout(timeoutRef.current);
    try {
      await navigator.clipboard.writeText(url);
      setLabel('Copied!');
      timeoutRef.current = setTimeout(() => setLabel('Copy page link'), 2000);
    } catch {
      window.prompt('Copy this link:', url);
    }
  }, [url]);

  return (
    <button type="button" onClick={onCopy} className={className} style={style}>
      {label}
    </button>
  );
}
