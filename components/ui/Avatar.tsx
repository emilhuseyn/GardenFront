'use client';
import { cn } from '@/lib/utils/constants';
import Image from 'next/image';
import { getInitials, getAvatarColor } from '@/lib/utils/format';

interface AvatarProps {
  name: string;
  src?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  ring?: boolean;
  ringColor?: string;
}

const sizeMap = {
  xs:  'w-6  h-6  text-xs',
  sm:  'w-8  h-8  text-xs',
  md:  'w-10 h-10 text-sm',
  lg:  'w-12 h-12 text-sm',
  xl:  'w-16 h-16 text-base',
  '2xl': 'w-20 h-20 text-lg',
};

export function Avatar({ name, src, size = 'md', className, ring, ringColor }: AvatarProps) {
  const initials = getInitials(name);
  const bgColor  = getAvatarColor(name);

  return (
    <div
      className={cn(
        'relative rounded-full flex-shrink-0 overflow-hidden select-none',
        sizeMap[size],
        ring && `ring-2 ring-offset-1 ${ringColor || 'ring-white'}`,
        className
      )}
      style={!src ? { backgroundColor: bgColor } : undefined}
      aria-label={name}
    >
      {src ? (
        <Image src={src} alt={name} fill className="object-cover" />
      ) : (
        <span className="absolute inset-0 flex items-center justify-center font-semibold text-white">
          {initials}
        </span>
      )}
    </div>
  );
}
