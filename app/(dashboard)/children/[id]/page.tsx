'use client';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ChildDetail } from '@/components/children/ChildDetail';

export default function ChildDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <button
        onClick={() => router.back()}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
      >
        <ArrowLeft size={15} /> Geri qayıt
      </button>
      <ChildDetail childId={id} onEdit={() => router.push(`/children/${id}/edit`)} />
    </div>
  );
}
