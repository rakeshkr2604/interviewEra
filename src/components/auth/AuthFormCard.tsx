'use client';

import type { ReactNode } from 'react';
import { FreeToolFormCard } from '@/components/landing/FreeToolFormCard';

export interface AuthFormCardProps {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
}

export function AuthFormCard({
  eyebrow = 'Account',
  title,
  subtitle,
  badge,
  children,
}: AuthFormCardProps) {
  return (
    <FreeToolFormCard
      headerEyebrow={eyebrow}
      headerTitle={title}
      headerSubtitle={subtitle}
      headerBadge={badge}
    >
      {children}
    </FreeToolFormCard>
  );
}
