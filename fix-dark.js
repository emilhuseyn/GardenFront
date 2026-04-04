const fs = require('fs');
const file = 'components/children/ChildDetail.tsx';
let content = fs.readFileSync(file, 'utf-8');

// statusColor
content = content.replace(/const statusColor: Record<string, string> = \{[\s\S]*?\};/, 
\const statusColor: Record<string, string> = {
  present:     'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 ring-1 ring-green-200 dark:ring-green-900/50',
  absent:      'bg-rose-100 dark:bg-rose-900/30 text-rose-700 dark:text-rose-400 ring-1 ring-rose-200 dark:ring-rose-900/50',
  inactive:    'bg-gray-50 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 ring-1 ring-gray-200 dark:ring-gray-700',
  not_counted: 'bg-violet-100 dark:bg-violet-900/30 text-violet-500 dark:text-violet-400 ring-1 ring-violet-200 dark:ring-violet-900/50',
};\);

// EVENT_STYLE
content = content.replace(/const EVENT_STYLE: Record<TimelineEvent\['tone'\], \{ dot: string; icon: string; card: string \}> = \{[\s\S]*?\};/,
\const EVENT_STYLE: Record<TimelineEvent['tone'], { dot: string; icon: string; card: string }> = {
  success: {
    dot: 'bg-green-500',
    icon: 'text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/40',
    card: 'border-green-100 dark:border-green-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-green-50/40 dark:to-green-900/20',
  },
  warning: {
    dot: 'bg-accent-rose',
    icon: 'text-accent-rose bg-rose-50 dark:text-rose-400 dark:bg-rose-900/40',
    card: 'border-rose-100 dark:border-rose-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-rose-50/40 dark:to-rose-900/20',
  },
  neutral: {
    dot: 'bg-accent-blue',
    icon: 'text-accent-blue bg-blue-50 dark:text-blue-400 dark:bg-blue-900/40',
    card: 'border-blue-100 dark:border-blue-900/30 bg-gradient-to-r from-white dark:from-[#1e2130] to-blue-50/40 dark:to-blue-900/20',
  },
};\);

// Header gradient
content = content.replace(
  'p-6 bg-gradient-to-br from-green-400/10 to-accent-blue/5 border border-white-border',
  'p-6 bg-gradient-to-br from-green-400/10 to-accent-blue/5 dark:from-green-400/5 dark:to-accent-blue/5 border border-white-border dark:border-gray-700/60'
);

// All text-gray-900 -> text-gray-900 dark:text-gray-50
content = content.replace(/text-gray-900/g, 'text-gray-900 dark:text-gray-50');
content = content.replace(/text-gray-800/g, 'text-gray-800 dark:text-gray-200');

// Tabs bg
content = content.replace('mb-6 bg-gray-50 p-1 rounded-xl', 'mb-6 bg-gray-50 dark:bg-gray-800/50 p-1 rounded-xl');
content = content.replace(/bg-white shadow-sm text-green-600/g, 'bg-white dark:bg-gray-700 shadow-sm text-green-600 dark:text-green-400');
content = content.replace(/text-gray-500 hover:text-gray-700/g, 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300');

// Timeline boxes
content = content.replace(
  /border border-white-border p-4 sm:p-5 bg-\[radial-gradient/g,
  'border border-white-border dark:border-gray-700/60 p-4 sm:p-5 bg-[radial-gradient'
);
content = content.replace(/bg-white\/80 p-3/g, 'bg-white/80 dark:bg-[#1e2130]/80 p-3');
content = content.replace(/bg-white p-4/g, 'bg-white dark:bg-[#1e2130] p-4');

// Info Card component
content = content.replace(/bg-white border border-white-border/g, 'bg-white dark:bg-[#1e2130] border border-white-border dark:border-gray-700/60');
content = content.replace(/bg-green-50 flex items-center/g, 'bg-green-50 dark:bg-green-900/30 flex items-center');

// Attendance blocks
content = content.replace('bg-green-50 rounded-xl p-3 text-center', 'bg-green-50 dark:bg-green-900/20 rounded-xl p-3 text-center');
content = content.replace('bg-rose-50 rounded-xl p-3 text-center', 'bg-rose-50 dark:bg-rose-900/20 rounded-xl p-3 text-center');
content = content.replace('bg-blue-50 rounded-xl p-3 text-center', 'bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-center');
content = content.replace('bg-violet-50 rounded-xl p-3 text-center', 'bg-violet-50 dark:bg-violet-900/20 rounded-xl p-3 text-center');

// Table empty state
content = content.replace('bg-gray-100 animate-pulse', 'bg-gray-100 dark:bg-gray-800 animate-pulse');
content = content.replace(/text-gray-700/g, 'text-gray-700 dark:text-gray-300');
content = content.replace(/hover:bg-gray-100/g, 'hover:bg-gray-100 dark:hover:bg-gray-700');

// Notes textarea
content = content.replace(
  'border border-white-border rounded-xl focus:outline-none',
  'border border-white-border dark:border-gray-700/60 dark:bg-[#1e2130] dark:text-gray-50 rounded-xl focus:outline-none'
);

fs.writeFileSync(file, content);
