'use client';
import { cn } from '@/lib/utils/constants';
import { Search, X } from 'lucide-react';
import { useRef } from 'react';

interface SearchBarProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  inputClassName?: string;
}

export function SearchBar({ value, onChange, placeholder = 'Axtar...', className, inputClassName }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className={cn('relative', className)}>
      <Search size={20} className="absolute left-4.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'h-11 w-full pl-14 pr-10 text-base font-semibold bg-white dark:bg-[#252836] text-gray-900 dark:text-gray-100 border border-white-border dark:border-gray-600 rounded-xl placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400 transition-colors shadow-sm',
          inputClassName
        )}
        aria-label={placeholder}
      />
      {value && (
        <button
          type="button"
          onClick={() => { onChange(''); inputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-md transition-colors"
          aria-label="Təmizlə"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}
