'use client';

import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface RecoveryActionProps {
  title: string;
  description: string;
  href: string;
  analyticsAction: string;
  icon?: LucideIcon;
  onNavigate?: (analyticsAction: string) => void;
}

export function RecoveryAction({
  title,
  description,
  href,
  analyticsAction,
  icon: Icon,
  onNavigate,
}: RecoveryActionProps) {
  return (
    <Link
      href={href}
      onClick={() => onNavigate?.(analyticsAction)}
      className={cn(
        'group flex min-h-[44px] w-full items-start gap-3 rounded-xl border-2 px-4 py-3.5 text-left transition-[border-color,box-shadow,transform] duration-150',
        'hover:-translate-y-0.5 motion-reduce:transform-none',
      )}
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 88%, transparent)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      {Icon ? (
        <span
          className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl"
          style={{
            background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
            color: 'var(--accent-primary)',
          }}
        >
          <Icon className="size-4" aria-hidden />
        </span>
      ) : null}
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1.5 text-sm font-semibold sm:text-base" style={{ color: 'var(--text-primary)' }}>
          {title}
          <ArrowRight
            className="size-4 shrink-0 opacity-60 transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
            aria-hidden
          />
        </span>
        <span className="mt-0.5 block text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
          {description}
        </span>
      </span>
    </Link>
  );
}
