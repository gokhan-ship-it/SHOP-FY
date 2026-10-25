// Tarih yardımcıları. Günler İstanbul saatine göre "YYYY-AA-GG" dizesidir; hafta pazartesi başlar.
export const TZ = "Europe/Istanbul";

const dayFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const hourFmt = new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** ISO zaman damgasını (ya da Date) İstanbul gününe çevirir. */
export function istDate(ts: string | Date): string {
  const d = typeof ts === "string" ? new Date(ts) : ts;
  return dayFmt.format(d);
}

export function todayIst(now: Date = new Date()): string {
  return istDate(now);
}

/** İstanbul saatine göre saat:dakika (0–23). */
export function istHourMinute(now: Date = new Date()): { h: number; m: number } {
  const [h, m] = hourFmt.format(now).split(":").map(Number);
  return { h, m };
}

function toUtc(d: string): Date {
  return new Date(d + "T00:00:00Z");
}

function fromUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function addDays(d: string, n: number): string {
  const x = toUtc(d);
  x.setUTCDate(x.getUTCDate() + n);
  return fromUtc(x);
}

export function addMonths(d: string, n: number): string {
  const x = toUtc(d);
  const day = x.getUTCDate();
  x.setUTCDate(1);
  x.setUTCMonth(x.getUTCMonth() + n);
  const max = daysInMonth(fromUtc(x));
  x.setUTCDate(Math.min(day, max));
  return fromUtc(x);
}

/** b − a gün sayısı. */
export function diffDays(a: string, b: string): number {
  return Math.round((toUtc(b).getTime() - toUtc(a).getTime()) / 86400000);
}

export function daysInMonth(d: string): number {
  const y = Number(d.slice(0, 4));
  const m = Number(d.slice(5, 7));
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

export function daysInYear(d: string): number {
  const y = Number(d.slice(0, 4));
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 366 : 365;
}

export function monthStart(d: string): string {
  return d.slice(0, 7) + "-01";
}

export function monthEnd(d: string): string {
  return d.slice(0, 7) + "-" + String(daysInMonth(d)).padStart(2, "0");
}

export function yearStart(d: string): string {
  return d.slice(0, 4) + "-01-01";
}

/** Pazartesi başlangıçlı haftanın ilk günü. */
export function weekStart(d: string): string {
  const dow = toUtc(d).getUTCDay(); // 0 = pazar
  return addDays(d, -((dow + 6) % 7));
}

/** Sezon 15 Şubat – 14 Şubat. Dönüş: sezonun başlangıç yılı. */
export function seasonStartYear(d: string): number {
  const y = Number(d.slice(0, 4));
  return d.slice(5) >= "02-15" ? y : y - 1;
}

export function seasonRange(startYear: number): { from: string; to: string } {
  return { from: `${startYear}-02-15`, to: `${startYear + 1}-02-14` };
}

export function seasonLabel(startYear: number): string {
  return `Sezon ${startYear}-${String(startYear + 1).slice(2)}`;
}

export function eachDay(from: string, to: string): string[] {
  const out: string[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function minDate(...ds: (string | null | undefined)[]): string | undefined {
  return ds.filter((x): x is string => !!x).sort()[0];
}

export function maxDate(...ds: (string | null | undefined)[]): string | undefined {
  const s = ds.filter((x): x is string => !!x).sort();
  return s[s.length - 1];
}

const TR_MONTHS = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"];
const TR_MONTHS_SHORT = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"];

export function monthLabel(ym: string, short = false): string {
  const m = Number(ym.slice(5, 7)) - 1;
  return `${(short ? TR_MONTHS_SHORT : TR_MONTHS)[m]} ${ym.slice(0, 4)}`;
}

/** 2026-02-14 → 14.02.2026 */
export function trDate(d: string): string {
  return `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
}

export function trDateShort(d: string): string {
  return `${Number(d.slice(8, 10))} ${TR_MONTHS_SHORT[Number(d.slice(5, 7)) - 1]}`;
}

export function trDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("tr-TR", { timeZone: TZ, dateStyle: "short", timeStyle: "short" }).format(new Date(iso));
}
