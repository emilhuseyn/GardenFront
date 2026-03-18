'use client';
import { cn } from '@/lib/utils/constants';
import { forwardRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  hint?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, hint, options, placeholder, id, ...props }, ref) => {
    const selectId = id || props.name;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={selectId} className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            {label}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={cn(
              'w-full appearance-none h-10 pl-3.5 pr-9 text-sm bg-white dark:bg-[#252836] text-gray-900 dark:text-gray-100 border rounded-lg',
              'focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors',
              'disabled:opacity-50 disabled:cursor-not-allowed',
              error ? 'border-accent-rose ring-1 ring-accent-rose' : 'border-white-border dark:border-gray-600',
              className
            )}
            aria-invalid={!!error}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <p className="mt-1.5 text-xs text-accent-rose" aria-live="polite">
            ⚠ {error}
          </p>
        )}
        {!error && hint && <p className="mt-1.5 text-xs text-gray-400">{hint}</p>}
      </div>
    );
  }
);

Select.displayName = 'Select';
export { Select };
