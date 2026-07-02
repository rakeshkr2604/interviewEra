'use client';

import { Eye, EyeOff } from 'lucide-react';
import {
  IE_FIELD_ERROR_CLASS,
  IE_FIELD_GROUP_CLASS,
  IE_FIELD_SURFACE_STYLE,
  IE_INPUT_CLASS,
  IE_LABEL_CLASS,
} from '@/lib/theme/component-classes';
import { cn } from '@/lib/utils';

const fieldSurface = IE_FIELD_SURFACE_STYLE;

export interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete: 'new-password' | 'current-password';
  showToggle?: boolean;
  showPassword?: boolean;
  onToggleShow?: () => void;
  error?: string;
  required?: boolean;
}

export function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete,
  showToggle = true,
  showPassword = false,
  onToggleShow,
  error,
  required = true,
}: PasswordFieldProps) {
  return (
    <div className={IE_FIELD_GROUP_CLASS}>
      {label ? (
        <label htmlFor={id} className={IE_LABEL_CLASS}>
          {label}
        </label>
      ) : null}
      <div className="relative">
        <input
          id={id}
          type={showPassword ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          autoComplete={autoComplete}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className={cn(IE_INPUT_CLASS, showToggle && 'pr-11')}
          style={fieldSurface}
        />
        {showToggle && onToggleShow ? (
          <button
            type="button"
            onClick={onToggleShow}
            className="absolute right-1 top-1/2 flex size-9 min-h-[44px] min-w-[44px] -translate-y-1/2 items-center justify-center rounded-lg transition-[background,color] hover:bg-[color-mix(in_srgb,var(--accent-primary)_10%,transparent)]"
            style={{ color: 'var(--text-muted)' }}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            aria-pressed={showPassword}
          >
            {showPassword ? <EyeOff className="size-4" strokeWidth={2} /> : <Eye className="size-4" strokeWidth={2} />}
          </button>
        ) : null}
      </div>
      {error ? (
        <p id={`${id}-error`} className={IE_FIELD_ERROR_CLASS} role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
