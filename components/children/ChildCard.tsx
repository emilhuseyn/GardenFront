'use client';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Phone, Clock, MoreVertical } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { formatPhone, getAge } from '@/lib/utils/format';
import { SCHEDULE_LABELS } from '@/lib/utils/constants';
import { cn } from '@/lib/utils/constants';
import type { Child } from '@/types';

interface ChildCardProps {
  child: Child;
  index?: number;
}

const paymentVariant = {
  paid: 'paid' as const,
  partial: 'partial' as const,
  unpaid: 'unpaid' as const,
};

const paymentLabel = {
  paid: 'Ödənilib ✓',
  partial: 'Qismən',
  unpaid: 'Borclu ✗',
};

export function ChildCard({ child, index = 0 }: ChildCardProps) {
  const fullName = `${child.firstName} ${child.lastName}`;
  // Mock payment status
  const payStatus = (['paid', 'partial', 'unpaid'] as const)[index % 3];
  const isEnglish = child.divisionName?.toLowerCase().includes('ingilis') || child.divisionName?.toLowerCase().includes('english');

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: index * 0.04 }}
      className="group bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60 rounded-xl overflow-hidden hover:shadow-md transition-all duration-200 hover:-translate-y-0.5"
    >
      {/* Card top accent */}
      <div
        className="h-1 w-full"
        style={{
          background: isEnglish
            ? 'linear-gradient(90deg, #34C47E, #22A965)'
            : 'linear-gradient(90deg, #4A90D9, #357ABD)'
        }}
      />

      <div className="p-5">
        {/* Avatar + Name */}
        <div className="flex items-start gap-3 mb-4">
          <Avatar name={fullName} size="lg" ring ringColor="ring-white-border" />
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 dark:text-gray-50 text-sm leading-tight truncate font-display">
              {fullName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">{getAge(child.dateOfBirth)} yaş</p>
          </div>
          <button className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-gray-400">
            <MoreVertical size={14} />
          </button>
        </div>

        {/* Badges row */}
        <div className="flex flex-wrap gap-1.5 mb-4">
          <Badge
            variant={isEnglish ? 'green' : 'blue'}
            size="pill"
          >
            {isEnglish ? '🇬🇧' : '🇷🇺'} {child.divisionName}
          </Badge>
          <Badge variant="gray" size="pill">
            <Clock size={9} />
            {SCHEDULE_LABELS[child.scheduleType]}
          </Badge>
        </div>

        {/* Group */}
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-green-400 flex-shrink-0" />
          {child.groupName}
        </p>

        {/* Phone */}
        <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400 mb-4">
          <Phone size={11} className="flex-shrink-0" />
          <a href={`tel:${child.parentPhone}`} className="hover:text-green-600 transition-colors truncate">
            {formatPhone(child.parentPhone)}
          </a>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-50 dark:border-gray-700/60">
          <Badge variant={paymentVariant[payStatus]} size="pill" dot pulse={payStatus === 'unpaid'}>
            {paymentLabel[payStatus]}
          </Badge>
          <Link href={`/children/${child.id}`}>
            <Button
              variant="ghost"
              size="xs"
              className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
              Bax →
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
}
