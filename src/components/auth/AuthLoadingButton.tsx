'use client';

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import {
  IE_SPINNER_LG_CLASS,
  IE_SUBMIT_BUTTON_CLASS,
  IE_SUBMIT_BUTTON_STYLE,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

export interface FormSubmitButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  children: ReactNode;
  loading?: boolean;
  loadingLabel?: string;
  /** Optional leading icon when not loading (e.g. Sparkles) */
  icon?: ReactNode;
}

export function FormSubmitButton({
  children,
  loading = false,
  loadingLabel,
  disabled = false,
  type = 'submit',
  className,
  icon,
  ...props
}: FormSubmitButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading}
      className={cn(IE_SUBMIT_BUTTON_CLASS, className)}
      style={IE_SUBMIT_BUTTON_STYLE}
      {...props}
    >
      {loading ? (
        <>
          <Loader2 className={IE_SPINNER_LG_CLASS} aria-hidden />
          {loadingLabel ?? children}
        </>
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </button>
  );
}

/** @deprecated Use FormSubmitButton — kept for existing auth imports */
export const AuthLoadingButton = FormSubmitButton;
