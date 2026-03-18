'use client';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/Button';
import { AttendanceGrid } from '@/components/attendance/AttendanceGrid';
import { Download } from 'lucide-react';
import Link from 'next/link';

export default function AttendancePage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Davamiyyət"
        description="Gündəlik davamiyyətin izlənməsi"
        actions={
          <Link href="/attendance/reports">
            <Button variant="secondary">
              <Download size={15} /> Hesabat
            </Button>
          </Link>
        }
      />
      <AttendanceGrid />
    </div>
  );
}
