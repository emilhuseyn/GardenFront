'use client';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { ChildForm } from '@/components/children/ChildForm';

export default function NewChildPage() {
  const router = useRouter();
  return (
    <div className="max-w-xl mx-auto">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors"
      >
        <ArrowLeft size={15} /> Geri qayıt
      </button>
      <div className="bg-white border border-white-border rounded-2xl p-6 shadow-card">
        <h2 className="text-lg font-bold text-gray-900 font-display mb-1">Yeni uşaq əlavə et</h2>
        <p className="text-sm text-gray-400 mb-6">Aşağıdakı formu doldurun</p>
        <ChildForm
          onSuccess={() => router.push('/children')}
          onCancel={() => router.back()}
        />
      </div>
    </div>
  );
}
