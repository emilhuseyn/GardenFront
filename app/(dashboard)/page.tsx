'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Users, UserCheck, TrendingUp, AlertCircle,
  Baby, ClipboardCheck, CreditCard, GraduationCap,
  BarChart3, Settings
} from 'lucide-react';
import { StatCard } from '@/components/dashboard/StatCard';
import { TodayAttendance } from '@/components/dashboard/TodayAttendance';
import { RecentPayments } from '@/components/dashboard/RecentPayments';
import { SmartAlertCenter } from '@/components/dashboard/SmartAlertCenter';
import { Card, CardHeader, CardTitle } from '@/components/ui/Card';
import { DonutChart } from '@/components/charts/DonutChart';
import { useAuthStore, getPermissions } from '@/lib/stores/authStore';
import { formatDate } from '@/lib/utils/format';
import { reportsApi } from '@/lib/api/reports';
import { paymentsApi } from '@/lib/api/payments';
import { attendanceApi } from '@/lib/api/attendance';
import { format } from 'date-fns';
import type { Statistics, MonthlyPaymentReport, DailyAttendance, DebtorInfo } from '@/types';

const moduleCards = [
  { href: '/children',   label: 'Uşaqlar',    icon: Baby,           gradient: 'linear-gradient(135deg, #34C47E, #22A965)', shadow: '0 8px 24px rgba(52,196,126,0.25)',   roles: ['admin', 'admission', 'teacher'] },
  { href: '/attendance', label: 'Davamiyyət', icon: ClipboardCheck, gradient: 'linear-gradient(135deg, #4A90D9, #357ABD)', shadow: '0 8px 24px rgba(74,144,217,0.25)',   roles: ['admin', 'teacher'] },
  { href: '/payments',   label: 'Ödənişlər',  icon: CreditCard,     gradient: 'linear-gradient(135deg, #F5A623, #E09208)', shadow: '0 8px 24px rgba(245,166,35,0.25)',   roles: ['admin', 'accountant'] },
  { href: '/groups',     label: 'Qruplar',    icon: GraduationCap,  gradient: 'linear-gradient(135deg, #2EC4B6, #20A99D)', shadow: '0 8px 24px rgba(46,196,182,0.25)',   roles: ['admin', 'teacher', 'admission'] },
  { href: '/reports',    label: 'Hesabatlar', icon: BarChart3,      gradient: 'linear-gradient(135deg, #7C5CBF, #6347A8)', shadow: '0 8px 24px rgba(124,92,191,0.25)',   roles: ['admin', 'accountant', 'teacher'] },
  { href: '/settings',   label: 'Parametrlər',icon: Settings,       gradient: 'linear-gradient(135deg, #6B7280, #4B5563)', shadow: '0 8px 24px rgba(107,114,128,0.2)',    roles: ['admin', 'accountant', 'teacher', 'admission'] },
];

const containerVariants = {
  animate: { transition: { staggerChildren: 0.07 } },
};

const itemVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
};

export default function DashboardPage() {
  const { user } = useAuthStore();
  const perms = getPermissions(user?.role);
  const isAccountant = user?.role === 'Accountant';
  const [stats, setStats] = useState<Statistics | null>(null);
  const [attendance, setAttendance] = useState<DailyAttendance | null>(null);
  const [monthlyReport, setMonthlyReport] = useState<MonthlyPaymentReport | null>(null);
  const [debtors, setDebtors] = useState<DebtorInfo[]>([]);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    const calls: Promise<unknown>[] = [
      paymentsApi.getMonthlyReport(month, year),
      paymentsApi.getDebtors(),
    ];
    if (!isAccountant) {
      calls.unshift(
        reportsApi.getStatistics(),
        attendanceApi.getDaily(today),
      );
    }

    if (isAccountant) {
      Promise.allSettled([
        paymentsApi.getMonthlyReport(month, year),
        paymentsApi.getDebtors(),
      ]).then(([reportRes, debtorsRes]) => {
        if (reportRes.status === 'fulfilled') setMonthlyReport(reportRes.value);
        if (debtorsRes.status === 'fulfilled') setDebtors(debtorsRes.value);
      });
    } else {
      Promise.allSettled([
        reportsApi.getStatistics(),
        attendanceApi.getDaily(today),
        paymentsApi.getMonthlyReport(month, year),
        paymentsApi.getDebtors(),
      ]).then(([statsRes, attRes, reportRes, debtorsRes]) => {
        if (statsRes.status === 'fulfilled') setStats(statsRes.value);
        if (attRes.status === 'fulfilled') setAttendance(attRes.value);
        if (reportRes.status === 'fulfilled') setMonthlyReport(reportRes.value);
        if (debtorsRes.status === 'fulfilled') setDebtors(debtorsRes.value);
      });
    }
  }, [isAccountant]);

  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const h = new Date().getHours();
    if (h < 12) setGreeting('Sabahınız xeyir');
    else if (h < 17) setGreeting('Günortanız xeyir');
    else if (h < 21) setGreeting('Axşamınız xeyir');
    else setGreeting('Gecəniz xeyir');
  }, []);

  const divisionData = (stats?.byDivision ?? []).map((d) => ({
    name: d.divisionName,
    value: d.childCount,
  }));

  const roleKey = isAccountant ? 'accountant'
    : user?.role === 'Teacher' ? 'teacher'
    : user?.role === 'AdmissionStaff' ? 'admission'
    : 'admin';

  const visibleModuleCards = moduleCards.filter((m) => m.roles.includes(roleKey));

  return (
    <div className="gradient-mesh min-h-full">
      {/* ── Hero Greeting ── */}
      <div className="mb-6">
        <motion.h1
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl font-bold text-gray-900 dark:text-gray-50 font-display"
        >
          {greeting}, {user?.name?.split(' ')[0] ?? 'Admin'}! 👋
        </motion.h1>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 capitalize"
        >
          {formatDate(new Date(), 'EEEE, d MMMM yyyy')}
        </motion.p>
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {!isAccountant && (
          <StatCard
            title="Aktiv Uşaqlar"
            value={stats?.totalActiveChildren ?? 0}
            icon={Users}
            trend={{ value: 3, isPositive: true }}
            accentColor="#34C47E"
            bgColor="#EDFAF3"
            iconColor="#22A965"
            delay={0}
          />
        )}
        {!isAccountant && (
          <StatCard
            title="Bu gün gəldi"
            value={attendance?.presentCount ?? 0}
            icon={UserCheck}
            trend={{ value: 2, isPositive: true }}
            accentColor="#4A90D9"
            bgColor="#EBF4FF"
            iconColor="#4A90D9"
            delay={0.07}
          />
        )}
        <StatCard
          title="Bu ay daxilolma"
          value={monthlyReport?.totalCollected ?? 0}
          icon={TrendingUp}
          trend={{ value: 8, isPositive: true }}
          accentColor="#F5A623"
          bgColor="#FFF8EC"
          iconColor="#E09208"
          prefix="₼"
          delay={isAccountant ? 0 : 0.14}
        />
        <StatCard
          title="Gecikmiş ödəniş"
          value={debtors.length}
          icon={AlertCircle}
          trend={{ value: 12, isPositive: false }}
          accentColor="#F56565"
          bgColor="#FFF0F0"
          iconColor="#F56565"
          delay={isAccountant ? 0.07 : 0.21}
        />
      </div>

      {/* ── Module Cards ── */}
      <motion.div
        variants={containerVariants}
        initial="initial"
        animate="animate"
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6"
      >
        {visibleModuleCards.map((m) => {
          const Icon = m.icon;
          return (
            <motion.div key={m.href} variants={itemVariants}>
              <Link
                href={m.href}
                className="block rounded-xl p-4 text-white transition-transform duration-200 hover:scale-105 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-green-400"
                style={{ background: m.gradient, boxShadow: m.shadow }}
              >
                <Icon size={24} className="mb-2 opacity-90" />
                <p className="text-sm font-semibold">{m.label}</p>
              </Link>
            </motion.div>
          );
        })}
      </motion.div>

      {/* ── Charts Row (admin/teacher only) ── */}
      {!isAccountant && (
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 mb-4">
          <Card className="lg:col-span-3" padding="md">
            <CardHeader>
              <CardTitle>Bölmə üzrə Uşaqlar</CardTitle>
              <span className="text-xs text-gray-400 dark:text-gray-500">Cəmi {stats?.totalActiveChildren ?? 0}</span>
            </CardHeader>
            <DonutChart
              data={divisionData}
              height={200}
              centerLabel="Cəmi"
              centerValue={String(stats?.totalActiveChildren ?? 0)}
            />
          </Card>

          <Card className="lg:col-span-2" padding="md">
            <CardHeader>
              <CardTitle>Qrafik üzrə Paylanma</CardTitle>
            </CardHeader>
            <DonutChart
              data={stats ? [
                { name: 'Tam günlük', value: stats.fullDayCount },
                { name: 'Yarım günlük', value: stats.halfDayCount },
              ] : []}
              colors={['#34C47E', '#F5A623']}
              height={200}
              centerLabel="Qrafik"
            />
          </Card>
        </div>
      )}

      {!isAccountant && <SmartAlertCenter />}

      {/* ── Bottom Row ── */}
      <div className={`grid grid-cols-1 ${!isAccountant ? 'lg:grid-cols-2' : ''} gap-4`}>
        {!isAccountant && <TodayAttendance />}
        <RecentPayments />
      </div>
    </div>
  );
}
