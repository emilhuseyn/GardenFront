'use client';
import { useState, useEffect } from 'react';
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
import { childrenApi } from '@/lib/api/children';
import type { Group } from '@/types';

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
  const [dobDay, setDobDay] = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear] = useState('');

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
  }, []);

  const {
    register, handleSubmit, watch, setValue, trigger,
    formState: { errors, isSubmitting },
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    defaultValues: {
      scheduleType: 0,
      monthlyFee: 300,
      paymentDay: defaultPaymentDay,
      parentFullName: '',
      secondParentFullName: '',
      parentPhone: '',
      secondParentPhone: '',
      parentEmail: '',
      ...(defaultGroupId !== undefined ? { groupId: defaultGroupId } : {}),
    },
  });

  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setValue('dateOfBirth', `${dobYear}-${dobMonth}-${dobDay}`, { shouldValidate: true });
    }
  }, [dobDay, dobMonth, dobYear, setValue]);

  const scheduleType = watch('scheduleType');

  const groupOptions = groups.map((g) => ({ value: String(g.id), label: g.name }));

  const nextStep = async () => {
    const fields: (keyof ChildFormValues)[][] = [
      ['firstName', 'lastName', 'dateOfBirth'],
      ['groupId', 'scheduleType'],
      ['parentFullName', 'secondParentFullName', 'parentPhone', 'secondParentPhone', 'monthlyFee', 'paymentDay'],
    ];
    const valid = await trigger(fields[step - 1]);
    if (valid) setStep((s) => Math.min(s + 1, 3));
  };

  const onSubmit = async (data: ChildFormValues) => {
    try {
      await childrenApi.create(data);
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
                    { value: 0 as const, label: 'Tam günlük',  time: '09:00 – 18:00', icon: '☀️' },
                    { value: 1 as const, label: 'Yarım günlük', time: '09:00 – 13:00', icon: '🌤️' },
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
                  placeholder="+994501234567"
                  error={errors.parentPhone?.message}
                  hint="+994XXXXXXXXX formatında daxil edin"
                />
              </div>
              <div>
                <Input
                  {...register('secondParentPhone')}
                  label="Əlavə telefon"
                  placeholder="+994501234567"
                  error={errors.secondParentPhone?.message}
                  hint="İstəyə bağlı: +994XXXXXXXXX"
                />
              </div>
              <Input {...register('parentEmail')} label="E-poçt" type="email" placeholder="email@example.com" error={errors.parentEmail?.message} />
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
