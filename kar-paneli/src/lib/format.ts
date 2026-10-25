// tr-TR biçimleri: ₺1.234,56
const tl0 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 0, minimumFractionDigits: 0 });
const tl2 = new Intl.NumberFormat("tr-TR", { style: "currency", currency: "TRY", maximumFractionDigits: 2, minimumFractionDigits: 2 });
const num0 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 });
const num1 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });
const num2 = new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 2, minimumFractionDigits: 2 });

const ok = (v: number | null | undefined): v is number => v !== null && v !== undefined && Number.isFinite(v);

export const tl = (v: number | null | undefined, decimals = false) => (ok(v) ? (decimals ? tl2 : tl0).format(v) : "—");
export const num = (v: number | null | undefined) => (ok(v) ? num0.format(v) : "—");
export const dec = (v: number | null | undefined, d: 1 | 2 = 2) => (ok(v) ? (d === 1 ? num1 : num2).format(v) : "—");
export const pct = (v: number | null | undefined, d: 1 | 2 = 1) => (ok(v) ? "%" + (d === 1 ? num1 : num2).format(v * 100) : "—");

/** Büyük tutarlar için kısa biçim: ₺12,4 Mn / ₺815 B */
export function tlShort(v: number | null | undefined): string {
  if (!ok(v)) return "—";
  const a = Math.abs(v);
  if (a >= 1_000_000) return "₺" + num2.format(v / 1_000_000).replace(/,?0+$/, "") + " Mn";
  if (a >= 10_000) return "₺" + num0.format(v / 1000) + " B";
  return tl0.format(v);
}

export function safeDiv(a: number, b: number): number | null {
  return b ? a / b : null;
}
