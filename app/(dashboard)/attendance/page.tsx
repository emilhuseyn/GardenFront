'use client';
import { useState } from 'react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { Download, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { attendanceApi } from '@/lib/api/attendance';
import { useAuthStore } from '@/lib/stores/authStore';

export default function AttendancePage() {
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === 'Administrator';
  const [syncDate, setSyncDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [syncLoading, setSyncLoading] = useState(false);

  const handleHikvisionSync = async () => {
    if (!syncDate) {
      toast.error('Tarix seçin');
      return;
    }

    setSyncLoading(true);
    try {
      const result = await attendanceApi.hikvisionSync(syncDate);
      const suffix = result.jobId ? ` (job: ${result.jobId})` : '';

      if (result.accepted) {
        toast.success(`Sinxronizasiya növbəyə alındı${suffix}`);
      } else {
        toast.success(`Sinxronizasiya başladıldı${suffix}`);
      }

      setTimeout(() => {
        window.location.reload();
      }, 4000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sinxronizasiya zamanı xəta baş verdi');
    } finally {
      setSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Davamiyyət"
        description="Gündəlik davamiyyətin izlənməsi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isAdmin && (
              <>
                <input
                  type="date"
                  value={syncDate}
                  onChange={(e) => setSyncDate(e.target.value)}
                  className="h-10 px-3 text-sm border border-white-border rounded-lg bg-white dark:bg-[#1e2130] dark:border-gray-700/60"
                />
                <Button onClick={handleHikvisionSync} loading={syncLoading}>
                  <RefreshCw size={15} /> Kameradan yüklə
                </Button>
              </>
            )}
            <Link href="/attendance/reports">
              <Button variant="secondary">
                <Download size={15} /> Hesabat
              </Button>
            </Link>
          </div>
        }
      />
      <AttendanceGrid />
    </div>
  );
}
