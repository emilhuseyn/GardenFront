'use client';
import * as SwitchPrimitive from '@radix-ui/react-switch';
import { cn } from '@/lib/utils/constants';

interface SwitchProps {
  checked: boolean;
  onCheckedChange?: (checked: boolean) => void;
  className?: string;
  disabled?: boolean;
  label?: string;
  size?: 'sm' | 'md';
}

export function Switch({ checked, onCheckedChange, className, disabled, label, size = 'md' }: SwitchProps) {
  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitive.Root
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
        className={cn(
          'relative inline-flex items-center rounded-full border-2 border-transparent transition-colors duration-200',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-400 focus-visible:ring-offset-2',
          'disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer',
          checked ? 'bg-green-400' : 'bg-gray-200',
          size === 'sm' ? 'h-5 w-9' : 'h-6 w-11',
          className
        )}
      >
        <SwitchPrimitive.Thumb
          className={cn(
            'block rounded-full bg-white shadow transition-transform duration-200',
            size === 'sm'
              ? cn('h-3.5 w-3.5', checked ? 'translate-x-4' : 'translate-x-0.5')
              : cn('h-4.5 w-4.5', checked ? 'translate-x-5' : 'translate-x-0.5')
          )}
        />
      </SwitchPrimitive.Root>
      {label && <span className="text-sm text-gray-700">{label}</span>}
    </div>
  );
}
