import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Query cache times in ms
export const CACHE_TIMES = {
  CHILDREN: 5 * 60 * 1000,  // 5 min
  GROUPS:   5 * 60 * 1000,  // 5 min
  ATTENDANCE: 1 * 60 * 1000, // 1 min
  PAYMENTS: 2 * 60 * 1000,  // 2 min
};

export const APP_NAME = 'KinderGarden';

export const MONTHS = [
  { value: 1, label: 'Yanvar' },
  { value: 2, label: 'Fevral' },
  { value: 3, label: 'Mart' },
  { value: 4, label: 'Aprel' },
  { value: 5, label: 'May' },
  { value: 6, label: 'İyun' },
  { value: 7, label: 'İyul' },
  { value: 8, label: 'Avqust' },
  { value: 9, label: 'Sentyabr' },
  { value: 10, label: 'Oktyabr' },
  { value: 11, label: 'Noyabr' },
  { value: 12, label: 'Dekabr' },
];

export const SCHEDULE_LABELS: Record<string | number, string> = {
  0: 'Tam günlük',
  1: 'Yarım günlük',
  FullDay:  'Tam günlük',
  HalfDay:  'Yarım günlük',
};

export const SCHEDULE_TIMES: Record<string | number, string> = {
  0: '09:00 – 18:00',
  1: '09:00 – 13:00',
  FullDay:  '09:00 – 18:00',
  HalfDay:  '09:00 – 13:00',
};

export const DIVISION_LABELS: Record<string, string> = {
  russian: 'Rus bölməsi',
  english: 'İngilis bölməsi',
};

export const DIVISION_COLORS: Record<string, string> = {
  russian: '#4A90D9',
  english: '#34C47E',
};

export const PAYMENT_STATUS_LABELS: Record<number, string> = {
  0: 'Ödənilib',
  1: 'Qismən',
  2: 'Borclu',
};

export const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  present: 'Gəldi',
  absent: 'Gəlmədi',
  not_counted: 'Sayılmır',
  early_leave: 'Tez çıxıb',
  not_marked: 'Qeyd edilməyib',
};

export const ROLE_LABELS: Record<string, string> = {
  Administrator: 'Administrator',
  Accountant: 'Mühasib',
  Teacher: 'Müəllim',
  AdmissionStaff: 'Qəbul Müdiri',
};

export const CHILD_STATUS_LABELS: Record<string, string> = {
  Active: 'Aktiv',
  Inactive: 'Deaktiv',
};

export const DISCOUNT_TYPE_LABELS: Record<number, string> = {
  0: 'Yoxdur',
  1: 'Faiz',
  2: 'Sabit',
};
