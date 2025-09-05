import * as React from 'react';
import { cn } from '@/lib/utils';

type Variant = 'default' | 'secondary' | 'ghost';
export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variantClasses: Record<Variant, string> = {
  default:
    'bg-white text-black hover:bg-white/90 shadow-sm shadow-black/20 dark:bg-foreground dark:text-background dark:hover:bg-foreground/90',
  secondary:
    'bg-transparent text-foreground border border-white/15 hover:bg-white/5',
  ghost:
    'bg-transparent text-foreground/70 hover:text-foreground hover:bg-white/5',
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'default', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'h-10 px-4 disabled:opacity-50 disabled:pointer-events-none',
        variantClasses[variant],
        className,
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
