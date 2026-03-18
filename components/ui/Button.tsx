'use client';
import { cn } from '@/lib/utils/constants';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { forwardRef } from 'react';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer',
  {
    variants: {
      variant: {
        primary:   'bg-green-400 text-white hover:bg-green-500 active:scale-[0.97] shadow-sm hover:shadow-md',
        secondary: 'bg-white-warm dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-white-border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600 active:scale-[0.97]',
        ghost:     'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white active:scale-[0.97]',
        danger:    'bg-accent-rose text-white hover:bg-red-600 active:scale-[0.97] shadow-sm',
        outline:   'border-2 border-green-400 text-green-600 hover:bg-green-50 active:scale-[0.97]',
        link:      'text-green-500 underline-offset-4 hover:underline p-0 h-auto',
        amber:     'bg-accent-amber text-white hover:bg-amber-500 active:scale-[0.97] shadow-sm',
      },
      size: {
        xs:  'h-7  px-2.5 text-xs  rounded-lg',
        sm:  'h-8  px-3   text-sm  rounded-lg',
        md:  'h-10 px-4   text-sm  rounded-xl',
        lg:  'h-11 px-6   text-base rounded-xl',
        xl:  'h-12 px-8   text-base rounded-xl',
        icon:'h-9  w-9  rounded-lg',
        'icon-sm': 'h-8 w-8 rounded-lg',
        'icon-lg': 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, loading, leftIcon, rightIcon, children, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? (
          <Loader2 size={14} className="animate-spin" />
        ) : leftIcon ? (
          <span className="flex-shrink-0">{leftIcon}</span>
        ) : null}
        {children}
        {!loading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
      </button>
    );
  }
);

Button.displayName = 'Button';
export { Button, buttonVariants };
