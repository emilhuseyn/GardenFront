import { toast } from 'sonner';

/**
 * Çek PDF-ini yeni tabda açır. Pop-up bloklanarsa anchor ilə cəhd edir.
 * Blob URL 5 dəqiqə sonra buraxılır — istifadəçi tabı bağlayana qədər açıq qalsın.
 */
export async function openReceiptBlob(
  load: () => Promise<{ blob: Blob; fileName: string }>
): Promise<boolean> {
  try {
    const receipt = await load();
    const receiptUrl = URL.createObjectURL(receipt.blob);
    const opened = window.open(receiptUrl, '_blank', 'noopener,noreferrer');

    if (!opened) {
      const a = document.createElement('a');
      a.href = receiptUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      a.click();
    }

    window.setTimeout(() => URL.revokeObjectURL(receiptUrl), 300000);
    return true;
  } catch {
    toast.error('Çek yüklənmədi');
    return false;
  }
}
