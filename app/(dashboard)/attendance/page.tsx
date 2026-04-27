'use client';
import { useState } from 'react';
import { format } from 'date-fns';
import Link from 'next/link';
import { Download, RefreshCw, Layers } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { attendanceApi } from '@/lib/api/attendance';
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalTitle,
} from '@/components/ui/Modal';
import type { HikvisionLog } from '@/types';

export default function AttendancePage() {
  const [hikvisionSyncLoading, setHikvisionSyncLoading] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);
  const [hikvisionSyncDate, setHikvisionSyncDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);
  const [syncLogs, setSyncLogs] = useState<HikvisionLog[]>([]);

  const handleFetchLogs = async () => {
    setLogsLoading(true);
    try {
      const logs = await attendanceApi.getHikvisionLogs(hikvisionSyncDate, hikvisionSyncDate);
      console.log('Fecth Logs Response:', logs);
      setSyncLogs(logs || []);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Loqları çəkərkən xəta baş verdi');
      setSyncLogs([]);
    } finally {
      setLogsLoading(false);
      setIsLogModalOpen(true);
    }
  };

  const handleHikvisionSync = async () => {
    if (!hikvisionSyncDate) {
      toast.error('Tarix seçin');
      return;
    }

    setHikvisionSyncLoading(true);
    try {
      const result = await attendanceApi.hikvisionSync(hikvisionSyncDate);
      const suffix = result.jobId ? ` (job: ${result.jobId})` : '';
      toast.success(`Sinxronizasiya növbəyə alındı${suffix}`);

      setTimeout(() => {
        handleFetchLogs();
      }, 4000);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Sinxronizasiya zamanı xəta baş verdi');
    } finally {
      setHikvisionSyncLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Davamiyyət"
        description="Gündəlik davamiyyətin izlənməsi"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="date"
              value={hikvisionSyncDate}
              onChange={(e) => setHikvisionSyncDate(e.target.value)}
              className="h-10 px-3 text-sm border border-white-border rounded-lg bg-white dark:bg-[#1e2130] dark:border-gray-700/60"
            />
            <Button loading={hikvisionSyncLoading} onClick={handleHikvisionSync}>
              <RefreshCw size={14} /> Kameradan yüklə
            </Button>
            <Button variant="secondary" loading={logsLoading} onClick={handleFetchLogs}>
              <Layers size={14} /> Loqlara bax
            </Button>
            <Link href="/attendance/reports">
              <Button variant="secondary">
                <Download size={15} /> Hesabat
              </Button>
            </Link>
          </div>
        }
      />
      <AttendanceGrid />

      <Modal open={isLogModalOpen} onOpenChange={setIsLogModalOpen}>
        <ModalContent size="xl">
          <ModalHeader>
            <ModalTitle>Hikvision Sinxronizasiya Loqları</ModalTitle>
          </ModalHeader>
          
          <div className="space-y-4">
            {syncLogs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Bu tarix üçün heç bir loq tapılmadı.
            </div>
          ) : (
            <div className="max-h-[60vh] overflow-y-auto w-full">
              {/* xəta ehtimalına qarşı test paneli (müvəqqəti əlavə olunub) */}
              {syncLogs.length > 0 && typeof syncLogs[0] === 'object' && !('syncDate' in syncLogs[0]) && !('SyncDate' in syncLogs[0]) && (
                <div className="bg-orange-50 p-4 rounded-lg mb-4 text-xs overflow-auto">
                  <strong>API-dən gələn cavab arzu olunan formatda deyil. Sürətli diaqnostika:</strong><br/>
                  <pre>{JSON.stringify(syncLogs, null, 2)}</pre>
                </div>
              )}
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-800 text-sm">
                    <th className="py-2 font-medium">Tarix</th>
                    <th className="py-2 font-medium">Saat</th>
                    <th className="py-2 font-medium">Uğurlu</th>
                    <th className="py-2 font-medium">Buraxılıb</th>
                    <th className="py-2 font-medium">Növü</th>
                    <th className="py-2 font-medium">Nəticə</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {syncLogs.map((log: any, idx) => (
                    <tr key={log.id || log.Id || idx} className="border-b border-gray-100 dark:border-gray-800/50 hover:bg-gray-50 dark:hover:bg-white/5">
                      <td className="py-2 flex items-center gap-2 text-gray-700 dark:text-gray-300">
                        {log.syncDate || log.SyncDate}
                      </td>
                      <td className="py-2 text-gray-700 dark:text-gray-300">
                        {(() => {
                           const t = log.syncTime || log.SyncTime || '';
                           if (t.includes('T')) return t.split('T')[1].substring(0, 8);
                           return t;
                        })()}
                      </td>
                      <td className="py-2 text-green-600 font-medium">{log.syncedCount ?? log.SyncedCount ?? 0}</td>
                      <td className="py-2 text-orange-600 font-medium">{log.skippedCount ?? log.SkippedCount ?? 0}</td>
                      <td className="py-2 text-gray-700 dark:text-gray-300 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs ${log.isManual || log.IsManual ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'} dark:bg-white/10 dark:text-white`}>
                          {log.isManual || log.IsManual ? 'Əllə' : 'Sistem (30 dəqiqədən bir)'}
                        </span>
                      </td>
                      <td className="py-2 text-gray-600 dark:text-gray-400 max-w-xs truncate" title={log.details || log.Details}>
                        {(() => {
                           const d = (log.details || log.Details || '').toLowerCase();
                           if (!d) return '-';
                           if (d.includes('no events found')) return 'Hadisə tapılmadı';
                           if (d.includes('success')) return 'Uğurlu';
                           if (d.includes('failed') || d.includes('error')) return 'Xəta baş verdi';
                           if (d.includes('timeout')) return 'Vaxt bitdi (Timeout)';
                           return log.details || log.Details;
                        })()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="secondary" onClick={() => setIsLogModalOpen(false)}>
              Bağla
            </Button>
          </div>
        </div>
      </ModalContent>
      </Modal>
    </div>
  );
}
