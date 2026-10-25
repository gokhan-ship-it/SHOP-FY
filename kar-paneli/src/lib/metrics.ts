// Dönem toplamları ve türetilmiş metrikler (brief §7.6). Kaynak: daily_pnl.
import { getDb } from "./db";
import { addDays, daysInMonth, diffDays, monthEnd, monthStart, seasonStartYear, todayIst, weekStart } from "./time";
import { fixedTotalsForDay, type FixedCostIn } from "./calc/fixed";
import { loadFxLookup } from "./fx";

export const PNL_FIELDS = [
  "gross",
  "discount",
  "shipping_charged",
  "revenue",
  "refunds",
  "net_revenue",
  "cogs",
  "shipping_cost",
  "commission",
  "kdv",
  "pre_ad_profit",
  "meta_spend",
  "other_marketing",
  "post_ad_profit",
  "fixed_company",
  "company_net",
  "fixed_personal",
  "take_home",
  "orders",
  "capsules",
  "couple_orders",
  "new_customer_orders",
] as const;

export type PnlField = (typeof PNL_FIELDS)[number];
export type Totals = Record<PnlField, number> & { days: number; metaMissingDays: number; metaTpDays: number };

const sumSql = PNL_FIELDS.map((f) => `coalesce(sum(${f}), 0) ${f}`).join(", ");

export function totals(from: string, to: string): Totals {
  const row = getDb()
    .$client.prepare(
      `select ${sumSql}, count(*) days,
              coalesce(sum(case when meta_source = 'yok' then 1 else 0 end), 0) metaMissingDays,
              coalesce(sum(case when meta_source = 'trueprofit' then 1 else 0 end), 0) metaTpDays
         from daily_pnl where date between ? and ?`,
    )
    .get(from, to) as Totals;
  return row;
}

export interface Derived {
  aov: number | null;
  roas: number | null;
  cac: number | null;
  newCac: number | null;
  cogsPct: number | null;
  discountPct: number | null;
  refundPct: number | null;
  margin: number | null;
  profitPerOrder: number | null;
  breakevenRoas: number | null;
  adCeilingPerOrder: number | null;
  capsulesPerOrder: number | null;
  coupleRate: number | null;
}

const div = (a: number, b: number) => (b ? a / b : null);

export function derive(t: Totals): Derived {
  return {
    aov: div(t.revenue, t.orders),
    roas: div(t.net_revenue, t.meta_spend),
    cac: div(t.meta_spend, t.orders),
    newCac: div(t.meta_spend, t.new_customer_orders),
    cogsPct: div(t.cogs, t.net_revenue),
    discountPct: div(t.discount, t.gross),
    refundPct: div(t.refunds, t.revenue),
    margin: div(t.post_ad_profit, t.net_revenue),
    profitPerOrder: div(t.post_ad_profit, t.orders),
    breakevenRoas: t.pre_ad_profit > 0 ? t.net_revenue / t.pre_ad_profit : null,
    adCeilingPerOrder: div(t.pre_ad_profit, t.orders),
    capsulesPerOrder: div(t.capsules, t.orders),
    coupleRate: div(t.couple_orders, t.orders),
  };
}

export type Grain = "gun" | "hafta" | "ay" | "sezon";

export function bucketKey(d: string, g: Grain): string {
  if (g === "gun") return d;
  if (g === "hafta") return weekStart(d);
  if (g === "ay") return d.slice(0, 7);
  return String(seasonStartYear(d));
}

export function series(from: string, to: string, g: Grain): ({ key: string } & Record<PnlField, number>)[] {
  const rows = getDb()
    .$client.prepare(`select date, ${PNL_FIELDS.join(", ")} from daily_pnl where date between ? and ? order by date`)
    .all(from, to) as ({ date: string } & Record<PnlField, number>)[];
  const out = new Map<string, { key: string } & Record<PnlField, number>>();
  for (const r of rows) {
    const k = bucketKey(r.date, g);
    let b = out.get(k);
    if (!b) {
      b = { key: k, ...(Object.fromEntries(PNL_FIELDS.map((f) => [f, 0])) as Record<PnlField, number>) };
      out.set(k, b);
    }
    for (const f of PNL_FIELDS) b[f] += r[f];
  }
  return [...out.values()];
}

export interface Forecast {
  realized: number;
  avgDaily: number;
  remainingDays: number;
  remainingFixed: number;
  forecast: number;
  month: string;
}

/** Ay sonu tahmini (net): gerçekleşen şirket net kârı + son 7 günün ort. reklam sonrası kârı × kalan gün − kalan günlerin şirket sabit gideri */
export function monthEndForecast(today = todayIst()): Forecast {
  const db = getDb().$client;
  const ms = monthStart(today);
  const realized = (db.prepare("select coalesce(sum(company_net), 0) v from daily_pnl where date between ? and ?").get(ms, today) as { v: number }).v;
  const last7 = (db.prepare("select coalesce(sum(post_ad_profit), 0) v from daily_pnl where date between ? and ?").get(addDays(today, -7), addDays(today, -1)) as { v: number }).v;
  const avgDaily = last7 / 7;
  const me = monthEnd(today);
  const remainingDays = diffDays(today, me);
  const fixed = db
    .prepare("select section, amount, currency, frequency, spread_months spreadMonths, start_date startDate, end_date endDate from fixed_costs")
    .all() as FixedCostIn[];
  const fx = loadFxLookup();
  let remainingFixed = 0;
  for (let d = addDays(today, 1); d <= me; d = addDays(d, 1)) remainingFixed += fixedTotalsForDay(fixed, d, fx).sirket;
  return { realized, avgDaily, remainingDays, remainingFixed, forecast: realized + avgDaily * remainingDays - remainingFixed, month: today.slice(0, 7) };
}

export function pctChange(cur: number | null, prev: number | null): number | null {
  if (cur === null || prev === null || !prev) return null;
  return (cur - prev) / Math.abs(prev);
}

export { daysInMonth };
