import * as React from 'react';
import { cn } from '@/lib/utils';

export type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors',
        'bg-foreground text-background hover:opacity-90 disabled:opacity-50 disabled:pointer-events-none',
        'h-10 px-4',
        className,
      )}
      {...props}
    />
  )
);
Button.displayName = 'Button';
