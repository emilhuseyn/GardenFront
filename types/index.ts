// ─── Auth ──────────────────────────────────────────────────────────────────────
export type UserRole = 'Administrator' | 'Accountant' | 'Teacher' | 'AdmissionStaff';

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  avatarUrl?: string;
  phoneNumber?: string;
  // Computed display name
  name: string;
}

export interface LoginResponse {
  token: string;
  email: string;
  fullName: string;
  role: UserRole;
  expiration: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ─── Division & Group ──────────────────────────────────────────────────────────
export interface Division {
  id: number;
  name: string;
  language: string;
  description?: string;
  groupCount: number;
}

export interface Group {
  id: number;
  name: string;
  divisionId: number;
  divisionName: string;
  teacherId?: string;
  teacherName?: string;
  maxChildCount: number;
  ageCategory: string;
  language: string;
  currentChildCount: number;
}

export interface GroupDetailChild {
  id: number;
  fullName: string;
  status: ChildStatus;
  scheduleType: 'FullDay' | 'HalfDay';
}

export interface GroupDetail extends Group {
  children: GroupDetailChild[];
}

// ─── Child ────────────────────────────────────────────────────────────────────
export type ChildStatus = 'Active' | 'Inactive';
export type ScheduleType = 'FullDay' | 'HalfDay';

export interface Child {
  id: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  groupName: string;
  divisionName: string;
  scheduleType: ScheduleType;
  monthlyFee: number;
  paymentDay: number;
  status: ChildStatus;
  parentFullName: string;
  secondParentFullName?: string;
  parentPhone: string;
  secondParentPhone?: string;
  teacherName?: string;
  attendanceDays?: number;
  absentDays?: number;
  totalDebt?: number;
  parentEmail?: string;
  registrationDate?: string;
}

export interface ChildFormData {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  groupId: number;
  scheduleType: 0 | 1; // POST body uses numbers
  monthlyFee: number;
  paymentDay: number;
  parentFullName: string;
  secondParentFullName?: string;
  parentPhone: string;
  secondParentPhone?: string;
  parentEmail?: string;
}

// ─── Attendance ───────────────────────────────────────────────────────────────
// AttendanceStatus: 1=Present, 2=Absent, 3=Excused, 4=NotCounted
export type AttendanceStatusEnum = 1 | 2 | 3 | 4;

export interface AttendanceEntry {
  id?: number;
  childId: number;
  childFullName?: string;
  date: string;
  status: AttendanceStatusEnum;
  isLate?: boolean;
  isEarlyLeave?: boolean;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}

export interface DailyAttendance {
  date: string;
  totalChildren: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  entries: AttendanceEntry[];
}

export interface MonthlyAttendanceChild {
  childId: number;
  childFullName: string;
  presentDays: number;
  absentDays: number;
  lateDays: number;
  earlyLeaveDays: number;
}

export interface MonthlyAttendance {
  month: number;
  year: number;
  totalWorkDays: number;
  children: MonthlyAttendanceChild[];
}

export interface MarkAttendanceEntry {
  childId: number;
  date: string;
  status: AttendanceStatusEnum;
  isLate?: boolean;
  arrivalTime?: string;
  departureTime?: string;
  notes?: string;
}

// ─── Payments ─────────────────────────────────────────────────────────────────
export type PaymentStatus = 0 | 1 | 2 | 'Paid' | 'PartiallyPaid' | 'Debt'; // API may return string or number
export type DiscountType = 0 | 1 | 2;  // 0=None, 1=Percentage, 2=Fixed

export interface Payment {
  id: number;
  childFullName: string;
  month: number;
  year: number;
  originalAmount: number;
  finalAmount: number;
  paidAmount: number;
  remainingDebt: number;
  status: PaymentStatus;
  notes?: string;
}

export interface PaymentFormData {
  childId: number;
  month: number;
  year: number;
  amount: number;
  notes?: string;
}

export interface DebtorInfo {
  childId: number;
  childFullName: string;
  groupName: string;
  divisionName: string;
  parentPhone: string;
  totalDebt: number;
  unpaidMonths: number[];
}

export interface DailyPaymentReport {
  date: string;
  totalCollected: number;
  paymentCount: number;
  payments: Payment[];
}

export interface MonthlyPaymentReport {
  month: number;
  year: number;
  totalExpected: number;
  totalCollected: number;
  totalDebt: number;
  paidCount: number;
  partialCount: number;
  debtCount: number;
}

// ─── Reports ──────────────────────────────────────────────────────────────────
export interface Statistics {
  totalActiveChildren: number;
  fullDayCount: number;
  halfDayCount: number;
  totalGroups: number;
  totalDivisions: number;
  byDivision: { divisionName: string; childCount: number }[];
}

export interface DivisionStats {
  divisionId: number;
  divisionName: string;
  groupCount: number;
  childCount: number;
  monthlyRevenue: number;
}

export interface ActiveInactive {
  activeCount: number;
  inactiveCount: number;
  activePercentage: number;
}

// ─── Schedule ─────────────────────────────────────────────────────────────────
export interface ScheduleConfig {
  id: number;
  scheduleType: ScheduleType;
  startTime: string; // HH:MM
  endTime: string;
  updatedAt: string;
}

// ─── Users (Admin) ────────────────────────────────────────────────────────────
export interface UserResponse {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber?: string;
  role: UserRole;
  isActive: boolean;
  createdAt?: string;
}

// ─── API Responses ────────────────────────────────────────────────────────────
export interface ApiResponse<T> {
  data: T;
  message?: string;
  success: boolean;
  errors?: string[] | null;
  statusCode: number;
}

export interface PaginatedResponse<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  hasNextPage: boolean;
}

// ─── UI Types ─────────────────────────────────────────────────────────────────
export interface NavItem {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  href: string;
  color?: string;
  badge?: number;
}

export interface StatCardData {
  title: string;
  value: number | string;
  trend?: { value: number; isPositive: boolean };
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
  bgColor: string;
  iconColor: string;
}

// ─── Filter Types ─────────────────────────────────────────────────────────────
export interface ChildFilters {
  groupId?: number;
  divisionId?: number;
  status?: 'Active' | 'Inactive';
  scheduleType?: ScheduleType;
  page?: number;
  pageSize?: number;
}

export interface AttendanceFilters {
  date: string;
  groupId?: number;
}

export interface PaymentFilters {
  month: number;
  year: number;
  groupId?: number;
}

// ─── FaceID ───────────────────────────────────────────────────────────────────
export interface FaceIdEvent {
  id: string;
  childId: string;
  childName: string;
  time: string;
  type: 'check_in' | 'check_out';
  confidence: number;
}

// ─── Dashboard ────────────────────────────────────────────────────────────────
export interface DashboardStats {
  activeChildren: number;
  todayPresent: number;
  monthlyRevenue: number;
  overduePayments: number;
  trends: {
    activeChildren: number;
    todayPresent: number;
    monthlyRevenue: number;
    overduePayments: number;
  };
}

// ─── Permissions ──────────────────────────────────────────────────────────────
export interface Permissions {
  children: { view: boolean; create: boolean; edit: boolean; delete: boolean };
  attendance: { view: boolean; create: boolean; edit: boolean };
  payments: { view: boolean; create: boolean; edit: boolean };
  groups: { view: boolean; create: boolean; edit: boolean };
  reports: { view: boolean };
  settings: { view: boolean; edit: boolean };
}
