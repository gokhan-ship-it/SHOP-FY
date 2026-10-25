// Dönem seçenekleri ve karşılaştırma aralıkları (brief §7.7).
import { addDays, addMonths, diffDays, monthStart, seasonLabel, seasonRange, seasonStartYear, todayIst, trDate, weekStart, yearStart } from "./time";

export const PERIOD_OPTIONS = [
  { key: "bugun", label: "Bugün" },
  { key: "dun", label: "Dün" },
  { key: "bu-hafta", label: "Bu hafta" },
  { key: "gecen-hafta", label: "Geçen hafta" },
  { key: "bu-ay", label: "Bu ay" },
  { key: "gecen-ay", label: "Geçen ay" },
  { key: "son-7", label: "Son 7 gün" },
  { key: "son-30", label: "Son 30 gün" },
  { key: "bu-yil", label: "Bu yıl" },
  { key: "sezon", label: "Bu sezon" },
  { key: "gecen-sezon", label: "Geçen sezon" },
  { key: "ozel", label: "Özel aralık" },
] as const;

export type PeriodKey = (typeof PERIOD_OPTIONS)[number]["key"];
export type CompareKey = "yok" | "onceki" | "gecen-yil";

export const COMPARE_OPTIONS: { key: CompareKey; label: string }[] = [
  { key: "onceki", label: "Önceki dönem" },
  { key: "gecen-yil", label: "Geçen yıl aynı dönem" },
  { key: "yok", label: "Karşılaştırma yok" },
];

export interface Range {
  from: string;
  to: string;
  label: string;
}

export function resolvePeriod(key: string, from?: string | null, to?: string | null, today = todayIst()): Range & { key: PeriodKey } {
  const k = (PERIOD_OPTIONS.some((p) => p.key === key) ? key : "bu-ay") as PeriodKey;
  const label = PERIOD_OPTIONS.find((p) => p.key === k)!.label;
  switch (k) {
    case "bugun":
      return { key: k, from: today, to: today, label };
    case "dun": {
      const d = addDays(today, -1);
      return { key: k, from: d, to: d, label };
    }
    case "bu-hafta":
      return { key: k, from: weekStart(today), to: today, label };
    case "gecen-hafta": {
      const s = addDays(weekStart(today), -7);
      return { key: k, from: s, to: addDays(s, 6), label };
    }
    case "bu-ay":
      return { key: k, from: monthStart(today), to: today, label };
    case "gecen-ay": {
      const s = addMonths(monthStart(today), -1);
      return { key: k, from: s, to: addDays(monthStart(today), -1), label };
    }
    case "son-7":
      return { key: k, from: addDays(today, -6), to: today, label };
    case "son-30":
      return { key: k, from: addDays(today, -29), to: today, label };
    case "bu-yil":
      return { key: k, from: yearStart(today), to: today, label };
    case "sezon": {
      const y = seasonStartYear(today);
      return { key: k, from: seasonRange(y).from, to: today, label: seasonLabel(y) };
    }
    case "gecen-sezon": {
      const y = seasonStartYear(today) - 1;
      return { key: k, ...seasonRange(y), label: seasonLabel(y) };
    }
    case "ozel": {
      const f = from && /^\d{4}-\d{2}-\d{2}$/.test(from) ? from : monthStart(today);
      const t = to && /^\d{4}-\d{2}-\d{2}$/.test(to) ? to : today;
      const [a, b] = f <= t ? [f, t] : [t, f];
      return { key: k, from: a, to: b, label: `${trDate(a)} – ${trDate(b)}` };
    }
  }
}

function shiftYear(d: string, n: number): string {
  return addMonths(d, 12 * n);
}

export function compareRange(r: Range & { key?: string }, mode: CompareKey): Range | null {
  if (mode === "yok") return null;
  if (mode === "gecen-yil") {
    return { from: shiftYear(r.from, -1), to: shiftYear(r.to, -1), label: "Geçen yıl aynı dönem" };
  }
  // Önceki dönem: ay/yıl/sezon başından itibaren olan dönemlerde takvimle hizalı karşılaştırma
  if (r.key === "gecen-ay") {
    const from = addMonths(r.from, -1);
    return { from, to: addDays(r.from, -1), label: "Önceki dönem" };
  }
  if (r.key === "bu-ay") {
    // Ayın aynı gününe kadar (önceki ay daha kısaysa ay sonuna kadar)
    const from = addMonths(r.from, -1);
    const end = addDays(r.from, -1);
    const to = addDays(from, diffDays(r.from, r.to));
    return { from, to: to > end ? end : to, label: "Önceki dönem" };
  }
  if (r.key === "bu-yil" || r.key === "sezon" || r.key === "gecen-sezon") {
    return { from: shiftYear(r.from, -1), to: shiftYear(r.to, -1), label: "Önceki dönem" };
  }
  const len = diffDays(r.from, r.to) + 1;
  return { from: addDays(r.from, -len), to: addDays(r.from, -1), label: "Önceki dönem" };
}
