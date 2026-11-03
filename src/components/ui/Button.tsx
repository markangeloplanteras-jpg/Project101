import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../../lib/cn';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md';
  icon?: ReactNode;
}

export function Button({ variant = 'secondary', size = 'md', icon, className, children, disabled, ...props }: ButtonProps) {
  const classes = {
    primary: 'btn-primary',
    secondary: 'btn-secondary',
    ghost: 'btn-ghost',
    danger: 'btn-danger',
  }[variant];
  return (
    <button className={cn('btn', classes, size === 'sm' && 'h-8 px-3 text-xs', className)} disabled={disabled} {...props}>
      {icon}
      {children}
    </button>
  );
}
