// TCMB günlük döviz satış kurları (USD, EUR). Hafta sonu ve tatillerde son iş gününün kuru kullanılır.
import { getDb } from "../db";
import { rebuildDaily } from "../calc/recalc";
import { addDays, todayIst } from "../time";
import { finishSync, startSync } from "./log";
import { fetchWithTimeout, sleep } from "./http";

const CURRENCIES = ["USD", "EUR"] as const;

export function parseTcmb(xml: string): { date: string; rates: Record<string, number> } | null {
  const t = /Tarih="(\d{2})\.(\d{2})\.(\d{4})"/.exec(xml);
  if (!t) return null;
  const rates: Record<string, number> = {};
  for (const cur of CURRENCIES) {
    const block = new RegExp(`<Currency[^>]*CurrencyCode="${cur}"[^>]*>([\\s\\S]*?)</Currency>`).exec(xml);
    const sell = block && /<ForexSelling>([\d.]+)<\/ForexSelling>/.exec(block[1]);
    const unit = block && /<Unit>(\d+)<\/Unit>/.exec(block[1]);
    if (sell) rates[cur] = Number(sell[1]) / Number(unit?.[1] ?? 1);
  }
  return { date: `${t[3]}-${t[2]}-${t[1]}`, rates };
}

async function fetchDay(date: string): Promise<{ date: string; rates: Record<string, number> } | null> {
  const [y, m, d] = date.split("-");
  const res = await fetchWithTimeout(`https://www.tcmb.gov.tr/kurlar/${y}${m}/${d}${m}${y}.xml`, {}, 30000);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`TCMB ${res.status} döndü.`);
  return parseTcmb(await res.text());
}

/** Kur gereken en eski gün: USD/EUR sabit giderlerin ve TRY dışı reklam hesaplarının en eski tarihi. */
function neededFrom(today: string): string {
  const c = getDb().$client;
  const fc = (c.prepare("select min(start_date) d from fixed_costs where currency in ('USD','EUR')").get() as { d: string | null }).d;
  const ad = (c.prepare(
    "select min(i.date) d from ad_insights_daily i join ad_accounts a on a.id = i.account_id where i.level = 'account' and coalesce(i.currency,'TRY') <> 'TRY'",
  ).get() as { d: string | null }).d;
  const base = addDays(today, -30);
  return [fc, ad, base].filter((x): x is string => !!x).sort()[0];
}

let running = false;

export async function syncFx(): Promise<{ status: "ok" | "hata" | "atlandi"; message: string }> {
  if (running) return { status: "atlandi", message: "Kur senkronu zaten çalışıyor." };
  running = true;
  const id = startSync("kur", "gunluk");
  try {
    const c = getDb().$client;
    const today = todayIst();
    const from = neededFrom(today);
    const have = new Set((c.prepare("select date from fx_rates where currency = 'USD' and date >= ?").all(from) as { date: string }[]).map((r) => r.date));
    const ins = c.prepare("insert or replace into fx_rates (date, currency, selling, source_date) values (?,?,?,?)");
    let last: { date: string; rates: Record<string, number> } | null = null;
    // Başlangıçtan önceki son kur (taşımak için)
    const prev = c.prepare("select date, currency, selling, source_date from fx_rates where date < ? order by date desc limit 2").all(from) as { currency: string; selling: number; source_date: string }[];
    if (prev.length) last = { date: prev[0].source_date, rates: Object.fromEntries(prev.map((p) => [p.currency, p.selling])) };
    let fetched = 0;
    for (let d = from; d <= today; d = addDays(d, 1)) {
      const dow = new Date(d + "T00:00:00Z").getUTCDay();
      if (have.has(d) && d !== today) {
        const rows = c.prepare("select currency, selling, source_date from fx_rates where date = ?").all(d) as { currency: string; selling: number; source_date: string }[];
        last = { date: rows[0]?.source_date ?? d, rates: Object.fromEntries(rows.map((r) => [r.currency, r.selling])) };
        continue;
      }
      let got: typeof last = null;
      if (dow !== 0 && dow !== 6) {
        got = await fetchDay(d).catch(() => null);
        fetched++;
        await sleep(150);
      }
      if (got && got.date === d) last = got;
      if (!last) continue;
      for (const [cur, v] of Object.entries(last.rates)) ins.run(d, cur, v, last.date);
    }
    // Bugünün dosyası henüz yoksa today.xml
    const todayRow = c.prepare("select 1 from fx_rates where date = ? and source_date = ?").get(today, today);
    if (!todayRow) {
      const res = await fetchWithTimeout("https://www.tcmb.gov.tr/kurlar/today.xml", {}, 30000).catch(() => null);
      const parsed = res?.ok ? parseTcmb(await res.text()) : null;
      if (parsed) for (const [cur, v] of Object.entries(parsed.rates)) ins.run(today, cur, v, parsed.date);
    }
    rebuildDaily();
    finishSync(id, "ok", `${fetched} gün sorgulandı`, fetched);
    return { status: "ok", message: `${fetched} gün sorgulandı` };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    finishSync(id, "hata", msg);
    return { status: "hata", message: msg };
  } finally {
    running = false;
  }
}
