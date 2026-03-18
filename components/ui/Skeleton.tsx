'use client';
import { cn } from '@/lib/utils/constants';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  lines?: number;
  circle?: boolean;
}

export function Skeleton({ className, lines, circle, ...props }: SkeletonProps) {
  if (lines) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, i) => (
          <div
            key={i}
            className={cn('h-4 animate-shimmer rounded-lg', i === lines - 1 && 'w-3/4', className)}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={cn(
        'animate-shimmer',
        circle ? 'rounded-full' : 'rounded-lg',
        className
      )}
      {...props}
    />
  );
}

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl p-5 space-y-4">
      <div className="flex items-center gap-3">
        <Skeleton className="w-10 h-10" circle />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
      <Skeleton lines={3} />
    </div>
  );
}

export function TableSkeleton({ rows = 5, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div className="space-y-0">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 px-4 py-3 border-b border-gray-100">
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} className={cn('h-4', j === 0 ? 'w-1/4' : 'flex-1')} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="bg-white border border-white-border rounded-xl p-5">
      <div className="flex justify-between mb-4">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <Skeleton className="h-9 w-24 mb-2" />
      <Skeleton className="h-4 w-32" />
    </div>
  );
}
