'use client';
import { Badge } from '@/components/ui/Badge';

interface ChildStatusBadgeProps {
  isActive: boolean;
  size?: 'xs' | 'sm' | 'md';
}

export function ChildStatusBadge({ isActive, size = 'sm' }: ChildStatusBadgeProps) {
  return (
    <Badge variant={isActive ? 'active' : 'inactive'} size={size} dot>
      {isActive ? 'Aktiv' : 'Qeyri-aktiv'}
    </Badge>
  );
}
