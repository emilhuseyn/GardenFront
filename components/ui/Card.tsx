'use client';
import { cn } from '@/lib/utils/constants';
import { forwardRef } from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  hover?: boolean;
  selected?: boolean;
  accentColor?: string;
}

const paddingMap = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' };

const Card = forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', hover, selected, accentColor, children, style, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          'bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl transition-all duration-200',
          paddingMap[padding],
          hover && 'hover:shadow-md cursor-pointer',
          selected && 'ring-2 ring-green-400 border-green-400',
          className
        )}
        style={{
          boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.06), 0 1px 2px -1px rgb(0 0 0 / 0.04)',
          ...style,
        }}
        {...props}
      >
        {accentColor && (
          <div
            className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
            style={{ backgroundColor: accentColor }}
          />
        )}
        {children}
      </div>
    );
  }
);

Card.displayName = 'Card';

function CardHeader({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)} {...props}>
      {children}
    </div>
  );
}

function CardTitle({ className, children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-base font-semibold text-gray-800 dark:text-gray-100 font-display', className)} {...props}>
      {children}
    </h3>
  );
}

function CardBody({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('', className)} {...props}>
      {children}
    </div>
  );
}

export { Card, CardHeader, CardTitle, CardBody };
