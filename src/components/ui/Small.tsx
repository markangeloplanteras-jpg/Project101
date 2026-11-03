import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn('skeleton rounded-xl', className)} />;
}

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-default px-6 py-12 text-center">
      {icon ? <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-accent-500/10 text-accent-500">{icon}</div> : null}
      <h3 className="text-base font-display">{title}</h3>
      {description ? <p className="mt-2 max-w-md text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-6">{action}</div> : null}
    </div>
  );
}

interface BadgeProps {
  children: ReactNode;
  tone?: 'default' | 'accent' | 'green' | 'amber' | 'red' | 'blue';
}

export function Badge({ children, tone = 'default' }: BadgeProps) {
  const tones = {
    default: 'bg-slate-500/10 text-slate-600 dark:text-slate-300',
    accent: 'bg-accent-500/10 text-accent-600 dark:text-accent-300',
    green: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
    amber: 'bg-amber-500/10 text-amber-600 dark:text-amber-400',
    red: 'bg-rose-500/10 text-rose-600 dark:text-rose-400',
    blue: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
  };
  return <span className={cn('badge', tones[tone])}>{children}</span>;
}

interface AvatarProps {
  name: string;
  src?: string | null;
  size?: 'sm' | 'md';
}

export function Avatar({ name, src, size = 'md' }: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
  const dimension = size === 'sm' ? 'h-8 w-8 text-xs' : 'h-10 w-10';
  if (src) {
    return <img src={src} alt={name} className={`shrink-0 rounded-full object-cover ${dimension}`} />;
  }
  return (
    <div className={`${dimension} flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-blue-600 font-display text-white`}>
      {initials || '?'}
    </div>
  );
}
