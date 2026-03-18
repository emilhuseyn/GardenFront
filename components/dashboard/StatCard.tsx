'use client';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useCountUp } from '@/lib/hooks/useUtils';
import { cn } from '@/lib/utils/constants';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  trend?: { value: number; isPositive: boolean };
  accentColor: string;
  bgColor: string;
  iconColor: string;
  suffix?: string;
  prefix?: string;
  delay?: number;
}

export function StatCard({
  title, value, icon: Icon, trend, accentColor, bgColor, iconColor,
  suffix = '', prefix = '', delay = 0
}: StatCardProps) {
  const count = useCountUp(value, 1000);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      className="bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl p-5 relative overflow-hidden"
      style={{ boxShadow: '0 1px 3px 0 rgb(0 0 0/0.06)' }}
    >
      {/* Left accent border */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
        style={{ backgroundColor: accentColor }}
      />

      <div className="flex items-start justify-between mb-4">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: bgColor }}
        >
          <Icon size={18} style={{ color: iconColor }} />
        </div>
        {trend && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full',
              trend.isPositive ? 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' : 'bg-rose-50 dark:bg-rose-900/30 text-rose-500 dark:text-rose-400'
            )}
          >
            {trend.isPositive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
            {trend.value > 0 ? '+' : ''}{trend.value}%
          </div>
        )}
      </div>

      <div className="font-mono-nums text-3xl font-bold text-gray-900 dark:text-gray-50 mb-0.5">
        {prefix}{count.toLocaleString()}{suffix}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
    </motion.div>
  );
}
