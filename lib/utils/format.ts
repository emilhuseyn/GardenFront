import { format, parseISO, differenceInYears, differenceInCalendarDays } from 'date-fns';
import { az } from 'date-fns/locale';

// ─── Date Formatting ──────────────────────────────────────────────────────────
export function formatDate(date: string | Date, pattern = 'd MMMM yyyy'): string {
  try {
    const d = typeof date === 'string' ? parseISO(date) : date;
    return format(d, pattern, { locale: az });
  } catch {
    return '';
  }
}

export function formatDateShort(date: string | Date): string {
  return formatDate(date, 'dd.MM.yyyy');
}

export function formatFullDate(date: string | Date): string {
  return formatDate(date, 'EEEE, d MMMM yyyy');
}

export function formatMonthYear(month: number, year: number): string {
  const d = new Date(year, month - 1, 1);
  return format(d, 'MMMM yyyy', { locale: az });
}

export function formatTime(time: string): string {
  return time?.slice(0, 5) ?? '';
}

export function getAge(birthDate: string): number {
  return differenceInYears(new Date(), parseISO(birthDate));
}

export function getOverdueDays(date: string): number {
  return differenceInCalendarDays(new Date(), parseISO(date));
}

export function isToday(date: string): boolean {
  const today = format(new Date(), 'yyyy-MM-dd');
  return date === today;
}

export function getTodayString(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Currency Formatting ──────────────────────────────────────────────────────
export function formatCurrency(amount: number): string {
  // Read format preference from store without a React hook (Zustand getState)
  // Lazy import to avoid circular deps at module init time
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const fmt: string = (() => { try { return require('@/lib/stores/themeStore').useThemeStore.getState().currencyFormat; } catch { return 'symbol'; } })();
  if (fmt === 'code') {
    return `${amount.toLocaleString('az-AZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} AZN`;
  }
  return `${amount.toLocaleString('az-AZ')} ₼`;
}

export function formatCurrencyShort(amount: number): string {
  return formatCurrency(amount);
}

// ─── Phone Formatting ─────────────────────────────────────────────────────────
export function formatPhone(phone: string): string {
  const clean = phone.replace(/\D/g, '');
  if (clean.startsWith('994')) {
    const num = clean.slice(3);
    return `+994 (${num.slice(0, 2)}) ${num.slice(2, 5)}-${num.slice(5, 7)}-${num.slice(7, 9)}`;
  }
  if (clean.length === 9) {
    return `+994 (${clean.slice(0, 2)}) ${clean.slice(2, 5)}-${clean.slice(5, 7)}-${clean.slice(7, 9)}`;
  }
  return phone;
}

export function formatPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('994')) return '+' + digits;
  if (digits.length > 0) return '+994' + digits;
  return value;
}

// ─── Text normalization helpers ──────────────────────────────────────────────
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('az')
    .replace(/ı/g, 'i')
    .replace(/\s+/g, ' ')
    .trim();
}

export function equalsNormalizedText(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return normalizeText(a) === normalizeText(b);
}

export function isEnglishDivisionName(value?: string): boolean {
  if (!value) return false;
  const normalized = normalizeText(value);
  return normalized.includes('ingilis')
    || normalized.includes('english')
    || normalized === 'en'
    || normalized.startsWith('en ');
}

export function isRussianDivisionName(value?: string): boolean {
  if (!value) return false;
  const normalized = normalizeText(value);
  return normalized.includes('rus')
    || normalized.includes('russian')
    || normalized === 'ru'
    || normalized.startsWith('ru ');
}

export type DivisionVisualVariant = 'green' | 'blue' | 'violet' | 'teal' | 'amber' | 'orange' | 'rose' | 'gray';

const DIVISION_VARIANTS: DivisionVisualVariant[] = ['green', 'blue', 'violet', 'teal', 'amber', 'orange', 'rose'];

const DIVISION_ACCENTS: Record<DivisionVisualVariant, string> = {
  green: 'linear-gradient(90deg, #34C47E, #22A965)',
  blue: 'linear-gradient(90deg, #4A90D9, #357ABD)',
  violet: 'linear-gradient(90deg, #8B5CF6, #6D28D9)',
  teal: 'linear-gradient(90deg, #14B8A6, #0F766E)',
  amber: 'linear-gradient(90deg, #F59E0B, #D97706)',
  orange: 'linear-gradient(90deg, #F97316, #EA580C)',
  rose: 'linear-gradient(90deg, #F43F5E, #E11D48)',
  gray: 'linear-gradient(90deg, #9CA3AF, #6B7280)',
};

function hashText(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = value.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

export function getDivisionBadgeVariant(value?: string): DivisionVisualVariant {
  if (!value) return 'gray';
  if (isEnglishDivisionName(value)) return 'green';
  if (isRussianDivisionName(value)) return 'blue';

  const normalized = normalizeText(value);
  return DIVISION_VARIANTS[hashText(normalized) % DIVISION_VARIANTS.length];
}

export function getDivisionFlag(value?: string): string {
  if (!value) return '🏫';
  if (isEnglishDivisionName(value)) return '🇬🇧';
  if (isRussianDivisionName(value)) return '🇷🇺';

  const normalized = normalizeText(value);
  if (normalized.includes('azerbaycan') || normalized.includes('azerbaijan') || normalized === 'az' || normalized.startsWith('az ')) {
    return '🇦🇿';
  }

  return '🏫';
}

export function getDivisionAccent(value?: string): string {
  const variant = getDivisionBadgeVariant(value);
  return DIVISION_ACCENTS[variant];
}

// ─── Name Formatting ──────────────────────────────────────────────────────────
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n.charAt(0).toUpperCase())
    .slice(0, 2)
    .join('');
}

export function truncateName(name: string, maxLength = 20): string {
  if (name.length <= maxLength) return name;
  return name.slice(0, maxLength) + '…';
}

// ─── Color helpers ────────────────────────────────────────────────────────────
const avatarColors = [
  '#34C47E', '#4A90D9', '#F5A623', '#7C5CBF',
  '#2EC4B6', '#FF6B35', '#F56565', '#1A8B52',
];

export function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return avatarColors[Math.abs(hash) % avatarColors.length];
}

// ─── Number formatting ────────────────────────────────────────────────────────
export function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

// ─── Percentage ───────────────────────────────────────────────────────────────
export function formatPercent(value: number, total: number): string {
  if (total === 0) return '0%';
  return `${Math.round((value / total) * 100)}%`;
}

// ─── Months in Azerbaijani ────────────────────────────────────────────────────
export const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export function getMonthName(month: number): string {
  return AZ_MONTHS[month - 1] ?? '';
}

// ─── Day names ────────────────────────────────────────────────────────────────
export const AZ_DAYS = ['Bazar', 'Bazar ertəsi', 'Çərşənbə axşamı', 'Çərşənbə', 'Cümə axşamı', 'Cümə', 'Şənbə'];

export function getDayName(date: Date | string): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return AZ_DAYS[d.getDay()];
}
