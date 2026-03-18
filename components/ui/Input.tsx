'use client';
import { cn } from '@/lib/utils/constants';
import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const inputVariants = cva(
  'w-full border text-sm transition-colors duration-150 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-0 focus:border-green-400 disabled:opacity-50 disabled:cursor-not-allowed',
  {
    variants: {
      variant: {
        default: 'bg-white dark:bg-[#252836] border-white-border dark:border-gray-600 rounded-lg text-gray-900 dark:text-gray-100',
        filled:  'bg-white-warm dark:bg-gray-700 border-transparent rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-900 dark:text-gray-100',
        error:   'bg-white dark:bg-[#252836] border-accent-rose rounded-lg ring-1 ring-accent-rose text-gray-900 dark:text-gray-100',
      },
      inputSize: {
        sm: 'h-8  px-3   text-xs',
        md: 'h-10 px-3.5 text-sm',
        lg: 'h-11 px-4   text-base',
      },
    },
    defaultVariants: {
      variant: 'default',
      inputSize: 'md',
    },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  inputSize?: 'sm' | 'md' | 'lg';
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, inputSize, label, error, hint, leftIcon, rightIcon, type, id, ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;
    const inputId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {leftIcon}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type={inputType}
            className={cn(
              inputVariants({ variant: error ? 'error' : variant, inputSize }),
              leftIcon && 'pl-9',
              (rightIcon || isPassword) && 'pr-9',
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
          {isPassword ? (
            <button
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              onClick={() => setShowPassword((v) => !v)}
              tabIndex={-1}
              aria-label={showPassword ? 'Şifrəni gizlət' : 'Şifrəni göstər'}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          ) : rightIcon ? (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              {rightIcon}
            </div>
          ) : null}
        </div>
        {error && (
          <p id={`${inputId}-error`} className="mt-1.5 text-xs text-accent-rose flex items-center gap-1" aria-live="polite">
            <span>⚠</span> {error}
          </p>
        )}
        {!error && hint && (
          <p id={`${inputId}-hint`} className="mt-1.5 text-xs text-gray-400">
            {hint}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
export { Input };
