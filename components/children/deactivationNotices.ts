import { toast } from 'sonner';
import { AZ_MONTHS, formatCurrency } from '@/lib/utils/format';
import type { DeactivationRecalcResult, ReactivationResult } from '@/lib/api/children';

const period = (month: number, year: number) => `${AZ_MONTHS[month - 1] ?? month} ${year}`;

/**
 * Çıxış ayının hesablanan dövrü. Backend-də bitiş günü İNKLÜZİVDİR (son hesablanan gün), uşaq
 * həmin ay heç gəlməyibsə isə aralıq BOŞ olur və bitiş başlanğıcdan kiçik gəlir (məs. 1/0) —
 * o halda "1-0 gün" yazmaq əvəzinə açıq şəkildə "0 gün" göstərilir.
 */
const periodDays = (startDay: number, endDay: number) =>
  endDay < startDay ? '0 gün' : `${startDay}-${endDay} (${endDay - startDay + 1} gün)`;

/**
 * Çıxış tarixi dəyişdikdə ştabın bilməli olduğu hər şeyi göstərir:
 *  1) real pul ödənildiyi üçün sıfırlanmayan aylar (geri qaytarma əl ilə),
 *  2) çıxış ayının yenidən bölünməsindən yaranan artıq ödəniş (D2),
 *  3) çıxış ayı irəli sürüşdükdə yaranan az hesablanma (F5),
 *  4) əvvəlki səhv tarixlə sıfırlanıb indi bərpa olunan aylar,
 *  5) hesabı ÜMUMİYYƏTLƏ olmayan aylar (F1) — avtomatik YARADILMIR, çünki uydurma borc
 *     yaratmaq riski var; ştab siyahını görür və lazım olsa ayı əl ilə yaradır,
 *  6) çıxış ayının öz nəticəsi (F3) — yeni yaradılıb, yenidən hesablanıb, yoxsa toxunulmayıb,
 *  7) bağlanmış qeydiyyat dövründə yekunlaşdırıldığı üçün toxunulmayan aylar (G2) və
 *     çıxışdan sonra sıfırlanan ayların sayı.
 */
export function warnSkippedPaidMonths(results: (DeactivationRecalcResult | undefined | null)[]) {
  const skipped = results.flatMap((result) =>
    (result?.skippedPaidMonths ?? []).map((m) => ({
      child: result?.childFullName ?? '',
      period: period(m.month, m.year),
      paidAmount: m.paidAmount,
    }))
  );

  if (skipped.length > 0) {
    const shown = skipped.slice(0, 4)
      .map((s) => `${s.child} — ${s.period}: ${formatCurrency(s.paidAmount)}`);
    if (skipped.length > shown.length) shown.push(`+${skipped.length - shown.length} ay`);

    toast.warning(
      `Ödənişi olan ${skipped.length} ay sıfırlanmadı — geri qaytarma əl ilə edilməlidir`,
      { description: shown.join(' • '), duration: 12000 }
    );
  }

  // G2: bağlanmış qeydiyyat dövründə yekunlaşdırıldığı üçün TOXUNULMAYAN aylar. Əvvəllər heç bir
  // siyahıya düşmürdü və ştab onların yenidən hesablandığını güman edirdi.
  const confirmed = results.flatMap((result) =>
    (result?.skippedConfirmedMonths ?? []).map((m) => ({
      child: result?.childFullName ?? '',
      period: period(m.month, m.year),
      finalAmount: m.finalAmount,
    }))
  );

  if (confirmed.length > 0) {
    const shown = confirmed.slice(0, 4)
      .map((c) => `${c.child} — ${c.period}: ${formatCurrency(c.finalAmount)}`);
    if (confirmed.length > shown.length) shown.push(`+${confirmed.length - shown.length} ay`);

    toast.warning(
      `Bağlanmış qeydiyyat dövrünün ${confirmed.length} ayına toxunulmadı — məbləğ olduğu kimi qaldı`,
      { description: shown.join(' • '), duration: 12000 }
    );
  }

  // Çıxış ayından SONRAKI sıfırlanan ayların sayı — əvvəllər heç bir toast-da görünmürdü (G2).
  const zeroedTotal = results.reduce((sum, r) => sum + (r?.zeroedMonths ?? 0), 0);
  const zeroedSuffix = zeroedTotal > 0 ? ` • sonrakı ${zeroedTotal} ay sıfırlandı` : '';

  // Çıxış ayı yenidən bölündükdə ödənilən məbləğ yeni məbləği keçə bilər — fərq qaytarılmalıdır.
  const overpaid = results.flatMap((result) => {
    const o = result?.exitMonthOverpayment;
    return o ? [{ child: result?.childFullName ?? '', o }] : [];
  });

  if (overpaid.length > 0) {
    toast.warning(
      `Çıxış ayında artıq ödəniş aşkarlandı — geri qaytarma əl ilə edilməlidir`,
      {
        description: overpaid
          .map(({ child, o }) =>
            `${child} — ${period(o.month, o.year)}: ödənilib ${formatCurrency(o.paidAmount)}, `
            + `yeni məbləğ ${formatCurrency(o.newFinalAmount)}, fərq ${formatCurrency(o.difference)}`)
          .join(' • '),
        duration: 15000,
      }
    );
  }

  // Çıxış ayı irəli sürüşdükdə tam ödənilmiş sətrin məbləği yenidən yazılmır — fərq əl ilə alınmalıdır (F5).
  const underpaid = results.flatMap((result) => {
    const u = result?.exitMonthUnderpayment;
    return u ? [{ child: result?.childFullName ?? '', u }] : [];
  });

  if (underpaid.length > 0) {
    toast.warning(
      `Çıxış ayı az hesablanıb — fərq əl ilə alınmalıdır`,
      {
        description: underpaid
          .map(({ child, u }) =>
            `${child} — ${period(u.month, u.year)}: ödənilib ${formatCurrency(u.paidAmount)}, `
            + `yeni məbləğ ${formatCurrency(u.newFinalAmount)}, fərq ${formatCurrency(u.difference)}`)
          .join(' • '),
        duration: 15000,
      }
    );
  }

  // Əvvəlki (daha erkən) çıxış tarixi ilə sıfırlanmış aylar geri qaytarıldı.
  const restored = results.flatMap((result) =>
    (result?.restoredMonths ?? []).map((m) => ({
      child: result?.childFullName ?? '',
      period: period(m.month, m.year),
      finalAmount: m.finalAmount,
      paidAmount: m.paidAmount ?? 0,
    }))
  );

  if (restored.length > 0) {
    const shown = restored.slice(0, 4).map((r) =>
      r.paidAmount > 0
        ? `${r.child} — ${r.period}: ${formatCurrency(r.finalAmount)} (ödənilib ${formatCurrency(r.paidAmount)})`
        : `${r.child} — ${r.period}: ${formatCurrency(r.finalAmount)}`
    );
    if (restored.length > shown.length) shown.push(`+${restored.length - shown.length} ay`);

    // Bərpa ödənişi olan ayın üstünə düşübsə ştab yoxlamalıdır — mavi info kifayət deyil.
    const touchedPaid = restored.filter((r) => r.paidAmount > 0).length;

    if (touchedPaid > 0) {
      toast.warning(
        `Bərpa olunan ${restored.length} aydan ${touchedPaid}-də ödəniş var — məbləği yoxlayın`,
        { description: shown.join(' • '), duration: 15000 }
      );
    } else {
      toast.info(
        `Çıxış tarixi düzəlişi: ${restored.length} ay yenidən hesablandı`,
        { description: shown.join(' • '), duration: 12000 }
      );
    }
  }

  // Çıxış ayının ÖZÜ (F3): yeni yaradılan və ya yenidən hesablanan sətir də görünməlidir —
  // əvvəllər toast yalnız "N ay yenidən hesablandı" deyirdi, yeni yaranan borcu isə susdururdu.
  const exitWritten = results.flatMap((result) => {
    const e = result?.exitMonth;
    return e && !e.needsManualReview ? [{ child: result?.childFullName ?? '', e }] : [];
  });

  if (exitWritten.length > 0) {
    const anyCreated = exitWritten.some(({ e }) => e.created);
    toast.info(
      anyCreated ? 'Çıxış ayı üçün hesab yaradıldı' : 'Çıxış ayı yenidən hesablandı',
      {
        description: exitWritten
          .map(({ child, e }) =>
            `${child} — ${period(e.month, e.year)}: ${formatCurrency(e.finalAmount)} `
            + `(${periodDays(e.periodStartDay, e.periodEndDay)})${e.created ? ' • yeni' : ''}`)
          .join(' • ') + zeroedSuffix,
        duration: 12000,
      }
    );
  }

  // Çıxış ayına TOXUNULMADI: ya real pul ödənilib, ya da ay "həqiqətən gəlmədi" deyə
  // təsdiqlənib. Hər iki halda məbləği avtomatik yazmaq düzgün deyil — ştab qərar verməlidir.
  const exitReview = results.flatMap((result) => {
    const e = result?.exitMonth;
    return e && e.needsManualReview ? [{ child: result?.childFullName ?? '', e }] : [];
  });

  if (exitReview.length > 0) {
    toast.warning(
      `Çıxış ayına toxunulmadı — əl ilə yoxlayın`,
      {
        description: exitReview
          .map(({ child, e }) =>
            `${child} — ${period(e.month, e.year)}: ${formatCurrency(e.finalAmount)}`
            + `${e.reason ? ` (${e.reason})` : ''}`)
          .join(' • ') + zeroedSuffix,
        duration: 15000,
      }
    );
  }

  // Hesabı ÜMUMİYYƏTLƏ olmayan aylar (F1). Backend belə ayları QƏSDƏN yaratmır: sxemdə
  // "uşaq gəlməyib" ilə "sətir generasiya olunmayıb" fərqlənmir, avtomatik yaratmaq isə real
  // valideynə uydurma borc yazardı. İtki artıq SƏSSİZ deyil — ştab görür və özü qərar verir.
  const missing = results.flatMap((result) =>
    (result?.missingMonths ?? []).map((m) => ({
      child: result?.childFullName ?? '',
      period: period(m.month, m.year),
    }))
  );

  if (missing.length > 0) {
    const shown = missing.slice(0, 6).map((m) => `${m.child} — ${m.period}`);
    if (missing.length > shown.length) shown.push(`+${missing.length - shown.length} ay`);

    const inline = missing.slice(0, 3).map((m) => m.period).join(', ');

    toast.warning(
      `${missing.length} ay üçün hesab yoxdur (${inline}${missing.length > 3 ? ', ...' : ''}) — lazım olsa əl ilə yaradın`,
      { description: shown.join(' • '), duration: 15000 }
    );
  }
}

/**
 * Uşaq geri qayıdanda (H1) ştabın bilməli olduqları:
 *  1) qayıdış ayının hesabı — yaradıldı / yenidən hesablandı (ən vacibi: həmin ay artıq borcdur),
 *  2) qayıdış ayına TOXUNULMADI (real pul ödənilib və ya ay onsuz da tam hesablanıb),
 *  3) qayıdışdan sonrakı sıfırlanmış ayların bərpası,
 *  4) qayıdışdan ƏVVƏLKİ ayların "uşaq gəlmədi" kimi yekunlaşdırılması (bir daha bərpa olunmur).
 */
export function notifyReactivation(results: (ReactivationResult | undefined | null)[]) {
  const confirmedCount = results.reduce((sum, r) => sum + (r?.confirmedMonths?.length ?? 0), 0);
  const confirmedSuffix = confirmedCount > 0
    ? ` • qayıdışdan əvvəlki ${confirmedCount} ay "gəlmədiyi ay" kimi yekunlaşdırıldı`
    : '';

  const written = results.flatMap((result) => {
    const m = result?.returnMonth;
    return m && !m.needsManualReview ? [{ child: result?.childFullName ?? '', m }] : [];
  });

  if (written.length > 0) {
    const anyCreated = written.some(({ m }) => m.created);
    toast.info(
      anyCreated ? 'Qayıdış ayı üçün hesab yaradıldı' : 'Qayıdış ayı yenidən hesablandı',
      {
        description: written
          .map(({ child, m }) =>
            `${child} — ${period(m.month, m.year)}: ${formatCurrency(m.finalAmount)} `
            + `(${m.periodStartDay}-${m.periodEndDay}, ${m.billedDays} gün)${m.created ? ' • yeni' : ''}`)
          .join(' • ') + confirmedSuffix,
        duration: 12000,
      }
    );
  }

  const review = results.flatMap((result) => {
    const m = result?.returnMonth;
    return m && m.needsManualReview ? [{ child: result?.childFullName ?? '', m }] : [];
  });

  if (review.length > 0) {
    toast.warning(
      'Qayıdış ayına toxunulmadı — əl ilə yoxlayın',
      {
        description: review
          .map(({ child, m }) =>
            `${child} — ${period(m.month, m.year)}: ${formatCurrency(m.finalAmount)}`
            + `${m.reason ? ` (${m.reason})` : ''}`)
          .join(' • ') + confirmedSuffix,
        duration: 15000,
      }
    );
  }

  const restored = results.flatMap((result) =>
    (result?.restoredMonths ?? []).map((m) => ({
      child: result?.childFullName ?? '',
      period: period(m.month, m.year),
      finalAmount: m.finalAmount,
      paidAmount: m.paidAmount ?? 0,
    }))
  );

  if (restored.length > 0) {
    const shown = restored.slice(0, 4).map((r) =>
      r.paidAmount > 0
        ? `${r.child} — ${r.period}: ${formatCurrency(r.finalAmount)} (ödənilib ${formatCurrency(r.paidAmount)})`
        : `${r.child} — ${r.period}: ${formatCurrency(r.finalAmount)}`
    );
    if (restored.length > shown.length) shown.push(`+${restored.length - shown.length} ay`);

    toast.info(
      `Qayıdışdan sonrakı ${restored.length} ay bərpa olundu`,
      { description: shown.join(' • '), duration: 12000 }
    );
  }

  // Qayıdış ayı üçün heç bir hesabat yoxdursa (məs. sətir yaradılmayıb) ştab ən azı
  // yekunlaşdırılan ayları görməlidir.
  if (written.length === 0 && review.length === 0 && restored.length === 0 && confirmedCount > 0) {
    toast.info(`Qayıdışdan əvvəlki ${confirmedCount} ay "gəlmədiyi ay" kimi yekunlaşdırıldı`, { duration: 10000 });
  }
}
