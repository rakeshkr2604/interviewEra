import Link from 'next/link';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export interface RoleCardProps {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  onClick?: () => void;
}

export function RoleCard({ title, description, href, icon: Icon, onClick }: RoleCardProps) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex min-h-[44px] flex-col rounded-2xl border-2 p-6 transition-[border-color,box-shadow,transform] duration-150 hover:-translate-y-0.5 motion-reduce:transform-none"
      style={{
        borderColor: 'var(--card-border)',
        background: 'color-mix(in srgb, var(--card-bg) 94%, transparent)',
        boxShadow: 'var(--card-shadow)',
      }}
    >
      <span
        className="mb-4 flex size-11 items-center justify-center rounded-xl"
        style={{
          background: 'color-mix(in srgb, var(--accent-primary) 14%, transparent)',
          color: 'var(--accent-primary)',
        }}
      >
        <Icon className="size-5" aria-hidden />
      </span>
      <h2 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {description}
      </p>
      <span
        className="mt-4 inline-flex items-center gap-1 text-sm font-semibold"
        style={{ color: 'var(--accent-primary)' }}
      >
        Get started
        <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5 motion-reduce:transform-none" aria-hidden />
      </span>
    </Link>
  );
}
