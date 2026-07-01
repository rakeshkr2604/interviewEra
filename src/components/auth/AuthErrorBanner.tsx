'use client';

import {
  IE_ALERT_BANNER_CLASS,
  IE_ALERT_ERROR_STYLE,
  IE_ALERT_SUCCESS_STYLE,
  IE_ALERT_WARNING_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

export function AuthErrorBanner({ message, className }: { message: string; className?: string }) {
  return (
    <p
      className={cn(IE_ALERT_BANNER_CLASS, className)}
      role="alert"
      style={IE_ALERT_ERROR_STYLE}
    >
      {message}
    </p>
  );
}

export function FormSuccessBanner({ message, className }: { message: string; className?: string }) {
  return (
    <p
      className={cn(IE_ALERT_BANNER_CLASS, className)}
      role="status"
      style={IE_ALERT_SUCCESS_STYLE}
    >
      {message}
    </p>
  );
}

export function FormWarningBanner({ message, className }: { message: string; className?: string }) {
  return (
    <p
      className={cn(IE_ALERT_BANNER_CLASS, className)}
      role="status"
      style={IE_ALERT_WARNING_STYLE}
    >
      {message}
    </p>
  );
}
