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
