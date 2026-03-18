'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils/constants';
import { Button } from '@/components/ui/Button';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, breadcrumbs, actions, badge, className }: PageHeaderProps) {
  return (
    <div className={cn('flex items-start justify-between gap-4 mb-6', className)}>
      <div>
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-1.5" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <ChevronRight size={11} />}
                {crumb.href ? (
                  <Link href={crumb.href} className="hover:text-green-600 transition-colors">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-600">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}
        <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50 font-display flex items-center gap-2">{title}{badge}</h1>
        {description && <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
    </div>
  );
}
