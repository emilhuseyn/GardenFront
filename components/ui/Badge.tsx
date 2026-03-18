'use client';
import { cn } from '@/lib/utils/constants';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef } from 'react';

const badgeVariants = cva(
  'inline-flex items-center gap-1 font-medium transition-colors',
  {
    variants: {
      variant: {
        green:  'bg-green-50  dark:bg-green-900/30  text-green-700  dark:text-green-400  border border-green-200  dark:border-green-700/40',
        blue:   'bg-blue-50   dark:bg-blue-900/30    text-blue-700   dark:text-blue-400   border border-blue-200   dark:border-blue-700/40',
        amber:  'bg-amber-50  dark:bg-amber-900/30   text-amber-700  dark:text-amber-400  border border-amber-200  dark:border-amber-700/40',
        rose:   'bg-rose-50   dark:bg-rose-900/30    text-rose-600   dark:text-rose-400   border border-rose-200   dark:border-rose-700/40',
        violet: 'bg-violet-50 dark:bg-violet-900/30  text-violet-700 dark:text-violet-400 border border-violet-200 dark:border-violet-700/40',
        teal:   'bg-teal-50   dark:bg-teal-900/30    text-teal-700   dark:text-teal-400   border border-teal-200   dark:border-teal-700/40',
        gray:   'bg-gray-100  dark:bg-gray-700/50    text-gray-600   dark:text-gray-300   border border-gray-200   dark:border-gray-600/40',
        orange: 'bg-orange-50 dark:bg-orange-900/30  text-orange-700 dark:text-orange-400 border border-orange-200 dark:border-orange-700/40',
        // Semantic variants
        paid:    'bg-green-50  dark:bg-green-900/30  text-green-700 dark:text-green-400  border border-green-200  dark:border-green-700/40',
        partial: 'bg-amber-50  dark:bg-amber-900/30  text-amber-700 dark:text-amber-400  border border-amber-200  dark:border-amber-700/40',
        unpaid:  'bg-rose-50   dark:bg-rose-900/30   text-rose-600  dark:text-rose-400   border border-rose-200   dark:border-rose-700/40',
        present: 'bg-green-50  dark:bg-green-900/30  text-green-700 dark:text-green-400',
        absent:  'bg-rose-50   dark:bg-rose-900/30   text-rose-600  dark:text-rose-400',
        late:    'bg-amber-50  dark:bg-amber-900/30  text-amber-700 dark:text-amber-400',
        active:  'bg-green-50  dark:bg-green-900/30  text-green-700 dark:text-green-400',
        inactive:'bg-gray-100  dark:bg-gray-700/50   text-gray-500  dark:text-gray-400',
      },
      size: {
        xs: 'text-xs px-1.5 py-0.5 rounded-md',
        sm: 'text-xs px-2   py-0.5 rounded-lg',
        md: 'text-sm px-2.5 py-1   rounded-lg',
        lg: 'text-sm px-3   py-1   rounded-xl',
        pill: 'text-xs px-2.5 py-0.5 rounded-full',
      },
    },
    defaultVariants: {
      variant: 'gray',
      size: 'sm',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  dot?: boolean;
  pulse?: boolean;
}

const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant, size, dot, pulse, children, ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(badgeVariants({ variant, size }), className)}
        {...props}
      >
        {dot && (
          <span
            className={cn(
              'w-1.5 h-1.5 rounded-full flex-shrink-0',
              pulse && 'animate-pulse',
              variant === 'paid' || variant === 'present' || variant === 'green' || variant === 'active'
                ? 'bg-green-500'
                : variant === 'unpaid' || variant === 'absent' || variant === 'rose'
                ? 'bg-rose-500'
                : variant === 'partial' || variant === 'late' || variant === 'amber'
                ? 'bg-amber-500'
                : 'bg-gray-400'
            )}
          />
        )}
        {children}
      </span>
    );
  }
);

Badge.displayName = 'Badge';
export { Badge, badgeVariants };
