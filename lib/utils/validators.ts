import { z } from 'zod';

const phoneRegex = /^\+994\d{9}$/;

export const childSchema = z.object({
  personId: z.number()
    .int('İVMS ID tam ədəd olmalıdır')
    .min(1, 'İVMS ID minimum 1 ola bilər')
    .optional(),
  firstName: z.string().min(2, 'Ən azı 2 hərf olmalıdır').max(50, 'Ən çox 50 hərf ola bilər'),
  lastName: z.string().min(2, 'Ən azı 2 hərf olmalıdır').max(50, 'Ən çox 50 hərf ola bilər'),
  dateOfBirth: z.string().min(1, 'Bu sahə mütləqdir'),
  groupId: z.number().min(1, 'Qrup seçin'),
  scheduleType: z.union([z.literal(0), z.literal(1)]),
  monthlyFee: z.number().min(1, 'Ödəniş məbləği mütləqdir').max(10000, 'Ən çox 10000 ₼ ola bilər'),
  paymentDay: z.number().min(1, 'Ödəniş günü seçin').max(28, 'Maksimum 28 ola bilər'),
  parentFullName: z.string().min(3, 'Ən azı 3 hərf olmalıdır'),
  secondParentFullName: z.string().min(3, 'Ən azı 3 hərf olmalıdır').optional().or(z.literal('')),
  parentPhone: z.string().regex(phoneRegex, 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)'),
  secondParentPhone: z.string().regex(phoneRegex, 'Düzgün telefon nömrəsi daxil edin (+994XXXXXXXXX)').optional().or(z.literal('')),
  parentEmail: z.string().email('Düzgün e-poçt daxil edin').optional().or(z.literal('')),
});

export const loginSchema = z.object({
  email: z.string().email('Düzgün e-poçt daxil edin'),
  password: z.string().min(6, 'Şifrə ən azı 6 simvol olmalıdır'),
  rememberMe: z.boolean().optional(),
});

export const paymentSchema = z.object({
  childId: z.number().min(1, 'Uşaq seçin'),
  month: z.number().min(1, 'Ay seçin').max(12),
  year: z.number().min(2020).max(2100),
  amount: z.number().min(0.01, 'Məbləğ mütləqdir'),
  cashboxId: z.number().min(1, 'Kassa seçin'),
  notes: z.string().optional(),
});

export const scheduleSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Düzgün vaxt formatı HH:MM'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Düzgün vaxt formatı HH:MM'),
});

export type ChildFormValues  = z.infer<typeof childSchema>;
export type LoginFormValues  = z.infer<typeof loginSchema>;
export type PaymentFormValues = z.infer<typeof paymentSchema>;
