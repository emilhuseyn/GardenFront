'use client';
import { cn } from '@/lib/utils/constants';
import { PackageOpen } from 'lucide-react';
import { Button } from './Button';

interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

export function EmptyState({ icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-6 text-center', className)}>
      <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
        {icon || <PackageOpen size={28} />}
      </div>
      <h3 className="text-base font-semibold text-gray-700 mb-1 font-display">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
      {action && (
        <Button className="mt-5" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
