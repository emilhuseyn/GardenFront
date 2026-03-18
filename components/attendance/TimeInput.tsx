'use client';
import { useRef, useState } from 'react';
import { cn } from '@/lib/utils/constants';

interface TimeInputProps {
  value?: string;
  onChange?: (val: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
}

export function TimeInput({ value = '', onChange, disabled, placeholder = '--:--', className }: TimeInputProps) {
  const ref = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^\d]/g, '').slice(0, 4);
    let formatted = raw;
    if (raw.length >= 3) {
      formatted = raw.slice(0, 2) + ':' + raw.slice(2);
    }
    // Validate hours 0-23, minutes 0-59
    if (raw.length === 4) {
      const hh = parseInt(raw.slice(0, 2), 10);
      const mm = parseInt(raw.slice(2), 10);
      if (hh > 23 || mm > 59) return;
    }
    onChange?.(formatted);
  };

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={handleChange}
      disabled={disabled}
      placeholder={placeholder}
      maxLength={5}
      className={cn(
        'w-16 text-center text-sm font-mono-nums px-2 py-1.5 rounded-lg border border-white-border dark:border-gray-600',
        'bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100',
        'focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400',
        'disabled:opacity-40 disabled:cursor-not-allowed placeholder:text-gray-400 dark:placeholder:text-gray-500',
        className
      )}
    />
  );
}
