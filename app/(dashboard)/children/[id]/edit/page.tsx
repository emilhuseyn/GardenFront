'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/Skeleton';
import { childSchema, type ChildFormValues } from '@/lib/utils/validators';
import { childrenApi } from '@/lib/api/children';
import { groupsApi } from '@/lib/api/groups';
import { cn } from '@/lib/utils/constants';
import type { Child, Group } from '@/types';

const AZ_MONTHS = [
  'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'İyun',
  'İyul', 'Avqust', 'Sentyabr', 'Oktyabr', 'Noyabr', 'Dekabr',
];

export default function EditChildPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const numId = Number(id);

  const [child, setChild]   = useState<Child | null>(null);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dobDay, setDobDay]     = useState('');
  const [dobMonth, setDobMonth] = useState('');
  const [dobYear, setDobYear]   = useState('');
  const [registrationDate, setRegistrationDate] = useState('');
  const [deactivationDate, setDeactivationDate] = useState('');

  const currentYear = new Date().getFullYear();
  const dayOptions   = Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }));
  const monthOptions = AZ_MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }));
  const yearOptions  = Array.from({ length: 14 }, (_, i) => currentYear - 1 - i).map((y) => ({ value: String(y), label: String(y) }));

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ChildFormValues>({
    resolver: zodResolver(childSchema),
    mode: 'onChange',
    reValidateMode: 'onChange',
  });

  const scheduleType = watch('scheduleType');

  // Load child + groups in parallel
  useEffect(() => {
    Promise.all([
      childrenApi.getById(numId),
      groupsApi.getAll(),
    ]).then(([c, g]) => {
      setChild(c);
      setGroups(g);

      // Pre-fill DOB selects
      if (c.dateOfBirth) {
        const [y, mo, d] = c.dateOfBirth.split('T')[0].split('-');
        setDobYear(y);
        setDobMonth(mo);
        setDobDay(d);
      }

      setRegistrationDate(c.registrationDate ? c.registrationDate.split('T')[0] : '');
      setDeactivationDate(c.deactivationDate ? c.deactivationDate.split('T')[0] : '');

      // Pre-fill the group id from groupName match (Child has groupName not groupId)
      const matchedGroup = g.find((gr) => gr.name === c.groupName);

      reset({
        personId: c.personId ?? undefined,
        firstName:      c.firstName,
        lastName:       c.lastName,
        dateOfBirth:    c.dateOfBirth?.split('T')[0] ?? '',
        groupId:        matchedGroup?.id ?? 0,
        scheduleType:   c.scheduleType === 'FullDay' ? 0 : 1,
        monthlyFee:     c.monthlyFee,
        paymentDay:     c.paymentDay ?? 1,
        parentFullName: c.parentFullName,
        secondParentFullName: c.secondParentFullName ?? '',
        parentPhone:    c.parentPhone,
        secondParentPhone: c.secondParentPhone ?? '',
        parentEmail:    c.parentEmail ?? '',
      });
    }).catch(() => toast.error('Məlumatlar yüklənmədi'))
      .finally(() => setLoading(false));
  }, [numId, reset]);

  // Sync DOB selects → form field
  useEffect(() => {
    if (dobDay && dobMonth && dobYear) {
      setValue('dateOfBirth', `${dobYear}-${dobMonth}-${dobDay}`, { shouldValidate: true });
    }
  }, [dobDay, dobMonth, dobYear, setValue]);

  const onSubmit = async (data: ChildFormValues) => {
    try {
      const toIsoDate = (value: string) => `${value}T00:00:00Z`;

      const normalizedPersonId = typeof data.personId === 'number' && Number.isFinite(data.personId) && data.personId > 0
        ? data.personId
        : null;

      if (normalizedPersonId !== null) {
        const existing = await childrenApi.findByPersonId(normalizedPersonId);
        if (existing && existing.id !== numId) {
          toast.error(`Bu İVMS ID artıq ${existing.firstName} ${existing.lastName} üçün istifadə olunur`);
          return;
        }
      }

      await childrenApi.update(numId, {
        ...data,
        personId: normalizedPersonId,
        ...(registrationDate ? { registrationDate: toIsoDate(registrationDate) } : {}),
        ...(child?.status === 'Inactive' && deactivationDate ? { deactivationDate: toIsoDate(deactivationDate) } : {}),
      });
      toast.success('Məlumatlar yeniləndi');
      router.push(`/children/${id}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Xəta baş verdi');
    }
  };

  const groupOptions = groups.map((g) => ({ value: String(g.id), label: g.name }));

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-5">
      <PageHeader
        title={`${child?.firstName} ${child?.lastName} - Redaktə`}
        description="Uşağın məlumatlarını yeniləyin"
        actions={
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={15} /> Geri
          </button>
        }
      />

      <form onSubmit={handleSubmit(onSubmit)}>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-5"
        >
          {/* Personal info */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Şəxsi Məlumat</h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Input {...register('firstName')} label="Ad *" error={errors.firstName?.message} />
                <Input {...register('lastName')} label="Soyad *" error={errors.lastName?.message} />
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
                  <select
                    value={dobDay}
                    onChange={(e) => setDobDay(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Gün</option>
                    {dayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={dobMonth}
                    onChange={(e) => setDobMonth(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">Ay</option>
                    {monthOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select
                    value={dobYear}
                    onChange={(e) => setDobYear(e.target.value)}
                    className="w-full h-10 px-3 rounded-xl border border-gray-200 bg-white text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-green-400/40 focus:border-green-400 transition-colors appearance-none cursor-pointer"
                  >
                    <option value="">İl</option>
                    {yearOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <input type="hidden" {...register('dateOfBirth')} />
                {errors.dateOfBirth && (
                  <p className="mt-1.5 text-xs text-red-500">{errors.dateOfBirth.message}</p>
                )}
              </div>
            </div>
          </Card>

          {/* Group & Schedule */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Qrup & Qrafik</h3>
            <div className="space-y-4">
              <Select
                {...register('groupId', { valueAsNumber: true })}
                label="Qrup *"
                options={groupOptions}
                error={errors.groupId?.message}
              />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Qrafik növü *</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 0 as const, label: 'Tam günlük',   time: '09:00 – 18:00', icon: '☀️' },
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
                          : 'border-gray-100 hover:border-gray-200'
                      )}
                    >
                      <span className="text-xl mb-1">{s.icon}</span>
                      <p className="text-sm font-semibold text-gray-800">{s.label}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{s.time}</p>
                    </button>
                  ))}
                </div>
              </div>
              <Input
                {...register('monthlyFee', { valueAsNumber: true })}
                label="Aylıq ödəniş (₼) *"
                type="number"
                min={1}
                error={errors.monthlyFee?.message}
              />
              <Select
                {...register('paymentDay', { valueAsNumber: true })}
                label="Ödəniş günü *"
                options={Array.from({ length: 28 }, (_, i) => ({ value: String(i + 1), label: String(i + 1) }))}
                error={errors.paymentDay?.message}
              />
            </div>
          </Card>

          {/* Parent info */}
          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Valideyn Məlumatı</h3>
            <div className="space-y-4">
              <Input
                {...register('parentFullName')}
                label="Valideynin adı soyadı *"
                placeholder="Əli Əliyev"
                error={errors.parentFullName?.message}
              />
              <Input
                {...register('secondParentFullName')}
                label="Əlavə valideyn adı soyadı"
                placeholder="Məs: Əliyev Kamran"
                error={errors.secondParentFullName?.message}
              />
              <Input
                {...register('parentPhone')}
                label="Telefon nömrəsi *"
                placeholder="+447700900123"
                error={errors.parentPhone?.message}
                hint="Beynəlxalq format: +994501234567 və ya +447700900123"
              />
              <Input
                {...register('secondParentPhone')}
                label="Əlavə telefon"
                placeholder="+447700900123"
                error={errors.secondParentPhone?.message}
                hint="İstəyə bağlı: beynəlxalq format"
              />
              <Input
                {...register('parentEmail')}
                label="E-poçt (ixtiyari)"
                type="email"
                placeholder="valideyn@email.com"
                error={errors.parentEmail?.message}
              />
            </div>
          </Card>

          <Card padding="md">
            <h3 className="text-sm font-semibold text-gray-700 mb-4">Tarix Məlumatları</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Qeydiyyat tarixi"
                value={registrationDate}
                onChange={(e) => setRegistrationDate(e.target.value)}
              />
              {child?.status === 'Inactive' ? (
                <Input
                  type="date"
                  label="Deaktiv tarixi"
                  value={deactivationDate}
                  onChange={(e) => setDeactivationDate(e.target.value)}
                />
              ) : (
                <Input
                  type="text"
                  label="Deaktiv tarixi"
                  value="Deaktiv deyil"
                  disabled
                />
              )}
            </div>
          </Card>

          {/* Actions */}
          <div className="flex gap-3 justify-end pb-6">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Ləğv et
            </Button>
            <Button type="submit" loading={isSubmitting}>
              <Save size={15} /> Yadda saxla
            </Button>
          </div>
        </motion.div>
      </form>
    </div>
  );
}
