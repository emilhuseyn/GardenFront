'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { childSchema, type ChildFormValues } from '@/lib/utils/validators';
import { cn } from '@/lib/utils/constants';
import { groupsApi } from '@/lib/api/groups';
import { schedulesApi } from '@/lib/api/schedules';
import { childrenApi } from '@/lib/api/children';
import type { Group, ScheduleConfig } from '@/types';

const STEPS = [
  { label: 'Şəxsi Məlumat',    step: 1 },
  { label: 'Qrup & Qrafik',    step: 2 },
  { label: 'Valideyn & Ödəniş', step: 3 },
];

interface ChildFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  defaultGroupId?: number;
}

export function ChildForm({ onSuccess, onCancel, defaultGroupId }: ChildFormProps) {
  const [step, setStep] = useState(1);
  const [done, setDone] = useState(false);
  const [groups, setGroups] = useState<Group[]>([]);
  const [scheduleMap, setScheduleMap] = useState<Record<string, { startTime: string; endTime: string }>>({
    FullDay: { startTime: '09:00', endTime: '18:00' },
    HalfDay: { startTime: '09:00', endTime: '13:00' },
  });
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');
  const [discountMode, setDiscountMode] = useState<'percentage' | 'amount'>('percentage');
  const [discountAmount, setDiscountAmount] = useState<number | ''>('');

  const AZ_MONTHS = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
    'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
  ];
  const currentYear = new Date().getFullYear();
  const defaultPaymentDay = Math.min(new Date().getDate(), 28);
  const dayOptions   = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }));
  const monthOptions = AZ_MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }));
  const yearOptions  = Array.from({ length: 12 }, (_, i) => currentYear - 1 - i).map((y) => ({ value: String(y), label: String(y) }));

  useEffect(() => {
    groupsApi.getAll().then(setGroups).catch(() => {});
    schedulesApi
      .getAll()
      .then((configs) => {
        const map: Record<string, { startTime: string; endTime: string }> = {
          FullDay: { startTime: '09:00', endTime: '18:00' },
          HalfDay: { startTime: '09:00', endTime: '13:00' },
        };
        configs.forEach((c: ScheduleConfig) => {
          map[c.scheduleType] = { startTime: c.startTime, endTime: c.endTime };
        });
        setScheduleMap(map);
      })
      .catch(() => {});
  }, []);

  const {
    register, handleSubmit, watch, setValue, trigger, setError, clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
    defaultValues: {
      scheduleType: 0,
      monthlyFee: 300,
      discountPercentage: null,
      paymentDay: defaultPaymentDay,
      parentFullName: '',
      secondParentFullName: '',
      parentPhone: '',
      secondParentPhone: '',
      ...(defaultGroupId !== undefined ? { groupId: defaultGroupId } : {}),
    },
  });

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setValue('dateOfBirth', `${dobYear}-${dobMonth}-${dobDay}`, { shouldValidate: true });
    }
  }, [dobDay, dobMonth, dobYear, setValue]);

  const scheduleType = watch('scheduleType');
  const monthlyFee = watch('monthlyFee');
  const discountPercentage = watch('discountPercentage');

  const groupOptions = groups.map((g) => ({ value: String(g.id), label: g.name }));
  const formatTime = (value: string) => value.split(':').slice(0, 2).join(':');
  const buildScheduleLabel = (type: 'FullDay' | 'HalfDay') => {
    const entry = scheduleMap[type];
    return entry ? `${formatTime(entry.startTime)} – ${formatTime(entry.endTime)}` : '';
  };
  const feeValue = typeof monthlyFee === 'number' && Number.isFinite(monthlyFee) ? monthlyFee : null;
  const discountPercentValue = typeof discountPercentage === 'number' && Number.isFinite(discountPercentage)
    ? discountPercentage
    : null;
  const computedDiscountAmount = feeValue !== null
    && discountPercentValue !== null
    && discountPercentValue >= 0
    && discountPercentValue <= 100
      ? Number(((feeValue * discountPercentValue) / 100).toFixed(2))
      : null;
  const computedDiscountPercentage = feeValue !== null && discountAmount !== '' && Number.isFinite(Number(discountAmount))
    ? Number(((Number(discountAmount) / feeValue) * 100).toFixed(2))
    : null;

  const handleDiscountModeChange = (mode: 'percentage' | 'amount') => {
    setDiscountMode(mode);
    if (mode === 'percentage') {
      clearErrors('discountPercentage');
    }
    if (mode === 'amount') {
      if (
        feeValue !== null
        && discountPercentValue !== null
        && discountPercentValue >= 0
        && discountPercentValue <= 100
      ) {
        setDiscountAmount(Number(((feeValue * discountPercentValue) / 100).toFixed(2)));
      } else {
        setDiscountAmount('');
      }
    }
  };

  useEffect(() => {
    if (discountMode !== 'amount') return;

    if (discountAmount === '' || discountAmount === null || discountAmount === undefined) {
      setValue('discountPercentage', null, { shouldValidate: true, shouldDirty: true });
      clearErrors('discountPercentage');
      return;
    }

    if (feeValue === null || feeValue <= 0) {
      setValue('discountPercentage', null, { shouldValidate: true, shouldDirty: true });
      clearErrors('discountPercentage');
      return;
    }

    const amountNumber = Number(discountAmount);
    if (Number.isFinite(amountNumber) && amountNumber > feeValue) {
      setError('discountPercentage', {
        type: 'manual',
        message: 'Endirim məbləği aylıq məbləği keçə bilməz.',
      });
      setValue('discountPercentage', null, { shouldValidate: false, shouldDirty: true });
      return;
    }

    clearErrors('discountPercentage');
    const percent = (amountNumber / feeValue) * 100;
    const normalized = Number.isFinite(percent) ? Number(percent.toFixed(2)) : null;
    setValue('discountPercentage', normalized, { shouldValidate: true, shouldDirty: true });
  }, [discountMode, discountAmount, feeValue, setValue, setError, clearErrors]);

  const nextStep = async () => {
    const fields: (keyof ChildFormValues)[][] = [
      ['firstName', 'lastName', 'dateOfBirth'],
      ['groupId', 'scheduleType'],
      ['parentFullName', 'secondParentFullName', 'parentPhone', 'secondParentPhone', 'monthlyFee', 'discountPercentage', 'paymentDay'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const onSubmit = async (data: ChildFormValues) => {
    try {
      const normalizedPersonId = typeof data.personId === 'number' && Number.isFinite(data.personId)
        ? data.personId
        : undefined;
      const normalizedDiscountPercentage = typeof data.discountPercentage === 'number' && Number.isFinite(data.discountPercentage)
        ? data.discountPercentage
        : null;

      if (normalizedPersonId !== undefined) {
        const existing = await childrenApi.findByPersonId(normalizedPersonId);
        if (existing) {
          toast.error(
            <div className="space-y-1">
              <p>Bu İVMS ID artıq {existing.firstName} {existing.lastName} üçün istifadə olunur</p>
              <Link
                href={`/children/${existing.id}`}
                className="text-xs font-medium underline text-blue-600 hover:text-blue-700"
              >
                Detala keç
              </Link>
            </div>
          );
          return;
        }
      }

      await childrenApi.create({
        ...data,
        personId: normalizedPersonId,
        parentEmail: null,
        discountPercentage: normalizedDiscountPercentage,
      });
      setDone(true);
      toast.success('Uşaq uğurla əlavə edildi!');
      setTimeout(() => onSuccess?.(), 1200);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Xəta baş verdi';
      toast.error(message);
    }
  };

  if (done) {
    return (
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="flex flex-col items-center justify-center py-12"
      >
        <div className="w-16 h-16 bg-green-400 rounded-full flex items-center justify-center mb-4">
          <Check size={28} className="text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 font-display">Uşaq əlavə edildi!</h3>
        <p className="text-sm text-gray-500 mt-1">Uşaq uğurla sistemə əlavə olundu.</p>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s.step} className="flex-1 flex items-center">
            <div className="flex flex-col items-center flex-1">
              <div className={cn(
                'w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold transition-all',
                step > s.step ? 'bg-green-400 text-white'
                  : step === s.step ? 'bg-green-400 text-white ring-4 ring-green-100'
                  : 'bg-gray-100 text-gray-400'
              )}>
                {step > s.step ? <Check size={14} /> : s.step}
              </div>
              <span className={cn(
                'text-xs mt-1.5 font-medium whitespace-nowrap',
                step >= s.step ? 'text-green-600' : 'text-gray-400'
              )}>
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-0.5 flex-1 mx-2 mb-5 rounded transition-colors',
                step > s.step ? 'bg-green-400' : 'bg-gray-100'
              )} />
            )}
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-100 rounded-full mb-6 overflow-hidden">
        <motion.div
          initial={{ width: '33.3%' }}
          animate={{ width: `${(step / 3) * 100}%` }}
          className="h-full bg-green-400 rounded-full"
          transition={{ duration: 0.3 }}
        />
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <Input {...register('firstName')} label="Ad *" placeholder="Aysel" error={errors.firstName?.message} />
                <Input {...register('lastName')} label="Soyad *" placeholder="Əliyeva" error={errors.lastName?.message} />
              </div>

              <Input
                {...register('personId', {
                  setValueAs: (value) => value === '' ? undefined : Number(value),
                })}
                label="İVMS ID"
                type="number"
                min={1}
                step={1}
                placeholder="Məs: 48"
                error={errors.personId?.message}
                hint="Hikvision personİd dəyəri (davamiyyət üçün)"
              />

              {/* DOB picker */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Doğum tarixi *</label>
                <div className="grid grid-cols-3 gap-2">
                  <div className="flex flex-col gap-1">
                    <select
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">Gün</option>
                      {dayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <select
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">Ay</option>
                      {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="flex flex-col gap-1">
                    <select
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                      className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                    >
                      <option value="">İl</option>
                      {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>
                {/* hidden field for RHF */}
                <input type="hidden" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.dateOfBirth.message}</p>
                )}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-5"
            >
              {/* Group */}
              <Select
                {...register('groupId', { valueAsNumber: true })}
                label="Qrup *"
                options={groupOptions}
                placeholder="Qrup seçin"
                error={errors.groupId?.message}
              />

              {/* Schedule radio cards */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qrafik növü *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 0 as const, label: 'Tam günlük',  time: buildScheduleLabel('FullDay'), icon: '☀️' },
                    { value: 1 as const, label: 'Yarım günlük', time: buildScheduleLabel('HalfDay'), icon: '🌤️' },
                  ].map((s) => (
                    <button
                      key={s.value}
                      type="button"
                      onClick={() => setValue('scheduleType', s.value)}
                      className={cn(
                        'flex flex-col p-4 rounded-xl border-2 text-left transition-all',
                        scheduleType === s.value
                          ? 'border-green-400 bg-green-50'
                          : 'border-white-border hover:border-gray-200'
                      )}
                    >
                      <span className="text-xl mb-1">{s.icon}</span>
                      <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.time}</p>
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-4"
            >
              <Input {...register('parentFullName')} label="Valideyn adı soyadı *" placeholder="Məhəmməd Əliyev" error={errors.parentFullName?.message} />
              <Input
                {...register('secondParentFullName')}
                label="Əlavə valideyn adı soyadı"
                placeholder="Məs: Əliyev Kamran"
                error={errors.secondParentFullName?.message}
              />
              <div>
                <Input
                  {...register('parentPhone')}
                  label="Telefon *"
                  placeholder="+447700900123"
                  error={errors.parentPhone?.message}
                  hint="Beynəlxalq formatda daxil edin (məs: +994501234567 və ya +447700900123). Boşluq və tire qəbul olunur."
                />
              </div>
              <div>
                <Input
                  {...register('secondParentPhone')}
                  label="Əlavə telefon"
                  placeholder="+447700900123"
                  error={errors.secondParentPhone?.message}
                  hint="İstəyə bağlı: beynəlxalq format (boşluq və tire qəbul olunur)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Aylıq ödəniş məbləği (₼) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium text-sm">₼</span>
                  <input
                    {...register('monthlyFee', { valueAsNumber: true })}
                    type="number"
                    className="w-full h-10 pl-8 pr-4 text-sm border border-white-border rounded-lg focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-green-400"
                    placeholder="300"
                    min="0"
                    step="10"
                  />
                </div>
                {errors.monthlyFee && (
                  <p className="mt-1 text-xs text-accent-rose">⚠ {errors.monthlyFee.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">Endirim növü</label>
                <div className="inline-flex rounded-lg border border-white-border bg-gray-50 p-1">
                  <button
                    type="button"
                    onClick={() => handleDiscountModeChange('percentage')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      discountMode === 'percentage'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Faiz
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDiscountModeChange('amount')}
                    className={cn(
                      'px-3 py-1.5 text-sm rounded-md transition-colors',
                      discountMode === 'amount'
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-500 hover:text-gray-700'
                    )}
                  >
                    Məbləğ
                  </button>
                </div>

                {discountMode === 'percentage' ? (
                  <Input
                    {...register('discountPercentage', {
                      setValueAs: (value) => {
                        if (value === '' || value === null || value === undefined) return null;
                        const parsed = Number(value);
                        return Number.isFinite(parsed) ? parsed : null;
                      },
                    })}
                    label="Endirim faizi (%)"
                    type="number"
                    min={0}
                    max={100}
                    step="0.1"
                    placeholder="Məs: 15.5"
                    error={errors.discountPercentage?.message}
                    hint={computedDiscountAmount !== null
                      ? `Hesablanan endirim məbləği: ₼${computedDiscountAmount}`
                      : 'İstəyə bağlı. 0 ilə 100 arasında dəyər daxil edin.'}
                  />
                ) : (
                  <Input
                    label="Endirim məbləği (₼)"
                    type="number"
                    min={0}
                    step="0.1"
                    placeholder="Məs: 50"
                    value={discountAmount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === '') {
                        setDiscountAmount('');
                        return;
                      }
                      const parsed = Number(value);
                      setDiscountAmount(Number.isFinite(parsed) ? parsed : '');
                    }}
                    error={errors.discountPercentage?.message}
                    hint={computedDiscountPercentage !== null
                      ? `Hesablanan endirim faizi: ${computedDiscountPercentage}%`
                      : 'İstəyə bağlı. Məbləği daxil edin, faiz avtomatik hesablanacaq.'}
                  />
                )}
              </div>

              <Select
                {...register('paymentDay', { valueAsNumber: true })}
                label="Ödəniş günü *"
                options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                error={errors.paymentDay?.message}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8 pt-5 border-t border-white-border">
          <Button
            type="button"
            variant="secondary"
            onClick={step === 1 ? onCancel : () => setStep((s) => s - 1)}
          >
            {step === 1 ? 'Ləğv et' : '← Geri'}
          </Button>
          {step < 3 ? (
            <Button type="button" onClick={nextStep}>
              İrəli →
            </Button>
          ) : (
            <Button type="submit" loading={isSubmitting}>
              <Check size={15} /> Əlavə et
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}
