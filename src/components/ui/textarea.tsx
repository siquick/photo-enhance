import * as React from 'react';
import { cn } from '@/lib/utils';

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'flex w-full rounded-md border border-black/10 dark:border-white/15 bg-transparent px-3 py-2 text-sm',
        'placeholder:text-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20',
        'disabled:cursor-not-allowed disabled:opacity-50 min-h-[90px]',
        className,
      )}
      {...props}
    />
  )
);
Textarea.displayName = 'Textarea';
