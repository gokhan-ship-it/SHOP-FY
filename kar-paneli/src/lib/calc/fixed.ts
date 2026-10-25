// Sabit giderlerin günlere dağıtımı (brief §7.5).
import { addMonths, daysInMonth, daysInYear, monthStart } from "../time";

export interface FixedCostIn {
  id?: number;
  section: string; // sirket | kisisel
  amount: number;
  currency: string; // TRY | USD | EUR
  frequency: string; // aylik | yillik | haftalik | tek
  spreadMonths?: number | null;
  startDate: string;
  endDate?: string | null;
}

/** Kur bulucu: o günün (yoksa önceki son iş gününün) TCMB satış kuru. */
export type FxLookup = (currency: string, date: string) => number | null;

/** Giderin o güne düşen payı (gider para biriminde). */
export function fixedCostShareForDay(fc: FixedCostIn, day: string): number {
  if (fc.frequency === "tek") {
    const n = fc.spreadMonths && fc.spreadMonths > 1 ? fc.spreadMonths : 1;
    if (n === 1) return day === fc.startDate ? fc.amount : 0;
    const first = monthStart(fc.startDate);
    const lastExclusive = addMonths(first, n);
    if (day < first || day >= lastExclusive) return 0;
    return fc.amount / n / daysInMonth(day);
  }
  if (day < fc.startDate) return 0;
  if (fc.endDate && day > fc.endDate) return 0;
  switch (fc.frequency) {
    case "aylik":
      return fc.amount / daysInMonth(day);
    case "yillik":
      return fc.amount / daysInYear(day);
    case "haftalik":
      return fc.amount / 7;
    default:
      return 0;
  }
}

/** TL karşılığı. Kur bulunamazsa null döner (veri sağlığında uyarı). */
export function fixedCostTlForDay(fc: FixedCostIn, day: string, fx: FxLookup): number | null {
  const share = fixedCostShareForDay(fc, day);
  if (!share) return 0;
  if (!fc.currency || fc.currency === "TRY") return share;
  const rate = fx(fc.currency, day);
  return rate === null ? null : share * rate;
}

export function fixedTotalsForDay(list: FixedCostIn[], day: string, fx: FxLookup): { sirket: number; kisisel: number; missingFx: boolean } {
  let sirket = 0;
  let kisisel = 0;
  let missingFx = false;
  for (const fc of list) {
    const v = fixedCostTlForDay(fc, day, fx);
    if (v === null) {
      missingFx = true;
      continue;
    }
    if (fc.section === "kisisel") kisisel += v;
    else sirket += v;
  }
  return { sirket, kisisel, missingFx };
}

/** Bir giderin aylık eşdeğeri (liste ekranındaki "aylık toplam" için, gider para biriminde). */
export function monthlyEquivalent(fc: Pick<FixedCostIn, "frequency" | "amount" | "spreadMonths">): number {
  switch (fc.frequency) {
    case "aylik":
      return fc.amount;
    case "yillik":
      return fc.amount / 12;
    case "haftalik":
      return (fc.amount * 52) / 12;
    case "tek":
      return fc.spreadMonths && fc.spreadMonths > 1 ? fc.amount / fc.spreadMonths : 0;
    default:
      return 0;
  }
}
