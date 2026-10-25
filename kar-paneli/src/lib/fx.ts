import { getDb } from "./db";
import type { FxLookup } from "./calc/fixed";

/** Veritabanındaki kurlardan bellek içi bulucu üretir. Tarihte kur yoksa önceki en yakın kur kullanılır. */
export function loadFxLookup(): FxLookup {
  const rows = getDb().$client.prepare("select date, currency, selling from fx_rates order by date").all() as {
    date: string;
    currency: string;
    selling: number;
  }[];
  const by = new Map<string, { date: string; selling: number }[]>();
  for (const r of rows) {
    const a = by.get(r.currency) ?? [];
    a.push(r);
    by.set(r.currency, a);
  }
  return (currency, date) => {
    const arr = by.get(currency);
    if (!arr?.length) return null;
    let lo = 0;
    let hi = arr.length - 1;
    if (date < arr[0].date) return arr[0].selling; // en eski kurdan önce: ilk kur
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (arr[mid].date <= date) lo = mid;
      else hi = mid - 1;
    }
    return arr[lo].selling;
  };
}
