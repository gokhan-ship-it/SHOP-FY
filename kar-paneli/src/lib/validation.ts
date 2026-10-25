// Doğrulama raporu: hesaplanan aylık rakamlar ile seed/dogrulama_referans.csv karşılaştırması (brief §9.3).
import { getDb } from "./db";

export const TOLERANCES = {
  orders: 0.02,
  netRevenue: 0.02,
  metaSpend: 0.005,
  cogs: 0.03,
  postAdProfit: 0.05,
} as const;

export type Metric = keyof typeof TOLERANCES;

export const METRIC_LABELS: Record<Metric, string> = {
  orders: "Sipariş",
  netRevenue: "Net ciro",
  metaSpend: "Meta reklam",
  cogs: "Ürün maliyeti",
  postAdProfit: "Reklam sonrası kâr",
};

export interface MonthCompare {
  month: string;
  values: Record<Metric, { ours: number; ref: number; diff: number | null; ok: boolean }>;
  allOk: boolean;
  reasons: string[];
  hasData: boolean;
}

interface Actual {
  month: string;
  orders: number;
  netRevenue: number;
  metaSpend: number;
  cogs: number;
  postAdProfit: number;
  otherMarketing: number;
  metaTpDays: number;
  metaMissingDays: number;
  days: number;
}

/** Referansın kapsadığı son gün (TrueProfit dökümündeki son sipariş günü). Son ay bu güne kadar karşılaştırılır. */
export function referenceEnd(): string | null {
  return (getDb().$client.prepare("select max(date) d from tp_orders").get() as { d: string | null }).d;
}

export function monthlyActuals(until: string = "9999-12-31"): Map<string, Actual> {
  const rows = getDb()
    .$client.prepare(
      `select substr(date, 1, 7) month, sum(orders) orders, sum(net_revenue) netRevenue, sum(meta_spend) metaSpend, sum(cogs) cogs,
              sum(post_ad_profit) postAdProfit, sum(other_marketing) otherMarketing,
              sum(case when meta_source = 'trueprofit' then 1 else 0 end) metaTpDays,
              sum(case when meta_source = 'yok' then 1 else 0 end) metaMissingDays, count(*) days
         from daily_pnl where date <= ? group by 1`,
    )
    .all(until) as Actual[];
  return new Map(rows.map((r) => [r.month, r]));
}

function monthFacts(month: string) {
  const c = getDb().$client;
  const q = <T>(sql: string) => c.prepare(sql).get(month) as T;
  return {
    unmatched: q<{ n: number }>("select count(*) n from order_calc where substr(date,1,7) = ? and included = 1 and unmatched_lines > 0").n,
    missingCost: q<{ n: number }>("select count(*) n from order_calc where substr(date,1,7) = ? and included = 1 and missing_cost_units > 0").n,
    unknownGateway: q<{ n: number }>("select count(*) n from order_calc where substr(date,1,7) = ? and included = 1 and gateway_known = 0").n,
    excluded: q<{ n: number }>("select count(*) n from order_calc where substr(date,1,7) = ? and included = 0").n,
    nonDtc: q<{ n: number }>("select count(*) n from order_calc where substr(date,1,7) = ? and included = 1 and dtc = 0").n,
    refundCount: q<{ n: number }>("select count(*) n from refund_calc where substr(date,1,7) = ?").n,
    refundAmount: q<{ v: number | null }>("select sum(amount) v from refund_calc where substr(date,1,7) = ?").v ?? 0,
    cogsBack: q<{ v: number | null }>("select sum(cogs_back) v from refund_calc where substr(date,1,7) = ?").v ?? 0,
    silver2025: month < "2026-02" ? q<{ v: number | null }>(
      `select sum(l.cogs) v from line_calc l join models m on m.code = l.model_code where substr(l.date,1,7) = ? and m.material = 'gümüş'`,
    ).v ?? 0 : 0,
  };
}

const fmt = (n: number) => new Intl.NumberFormat("tr-TR", { maximumFractionDigits: 0 }).format(n);

function explain(month: string, m: Metric, ours: number, ref: number, a: Actual | undefined, f: ReturnType<typeof monthFacts>, refEnd: string | null): string[] {
  const out: string[] = [];
  const dir = ours > ref ? "fazla" : "az";
  if (!a) return ["Bu ay için hesaplanmış veri yok (Shopify senkronu henüz bu tarihe ulaşmamış olabilir)."];
  switch (m) {
    case "orders":
      out.push(`Panel ${fmt(Math.abs(ours - ref))} sipariş ${dir} sayıyor.`);
      if (f.excluded) out.push(`${f.excluded} sipariş test ya da gönderilmeden iptal olduğu için hariç tutuldu.`);
      if (f.nonDtc) out.push(`${f.nonDtc} sipariş cirosu 0 ya da yalnızca event olduğu için DTC sayılmadı.`);
      if (f.unmatched) out.push(`${f.unmatched} siparişte eşleşmeyen ürün var; kategori bilinmediği için sınıflandırma farklı olabilir.`);
      break;
    case "netRevenue":
      out.push(`Net ciro referanstan ₺${fmt(Math.abs(ours - ref))} ${dir}.`);
      if (f.refundCount) out.push(`Bu ay ${f.refundCount} iade (₺${fmt(f.refundAmount)}) iade gününe yazıldı; TrueProfit iadeleri farklı güne yazmış olabilir.`);
      if (f.excluded) out.push(`${f.excluded} iptal/test siparişi hariç tutuldu; TrueProfit bunları farklı ele almış olabilir.`);
      break;
    case "metaSpend":
      if (a.metaTpDays) out.push("Bu ayın reklam harcaması Meta'dan değil, TrueProfit yedeğinden geliyor.");
      if (a.metaMissingDays) out.push(`${a.metaMissingDays} gün için reklam verisi yok.`);
      if (refEnd && refEnd.startsWith(month))
        out.push(`Referansın son günü (${refEnd.slice(8, 10)}.${refEnd.slice(5, 7)}) TrueProfit'ten gün içinde alınmış olabilir; o günün harcaması referansta yarım kalır.`);
      out.push("Meta reklam hesabının saat dilimi İstanbul değilse gün sınırları kayar; Veri sağlığı ekranındaki saat dilimi uyarısına bakın.");
      break;
    case "cogs":
      out.push(`Ürün maliyeti referanstan ₺${fmt(Math.abs(ours - ref))} ${dir}.`);
      if (f.cogsBack) out.push(`Stoğa dönen iadelerin maliyeti (₺${fmt(f.cogsBack)}) bu aydan geri alındı.`);
      if (f.missingCost) out.push(`${f.missingCost} siparişte maliyeti boş model var (0 sayıldı).`);
      if (f.unmatched) out.push(`${f.unmatched} siparişte eşleşmeyen ürün var (maliyet 0 sayıldı).`);
      if (f.silver2025) out.push(`Gümüş ürünlerin 2025 maliyeti kesin değil (bu ay ₺${fmt(f.silver2025)} gümüş maliyeti).`);
      break;
    case "postAdProfit":
      out.push("Reklam sonrası kâr, yukarıdaki kalemlerdeki farkların toplamıdır.");
      if (a.otherMarketing) out.push(`Karşılaştırmada UGC/hediye gönderimleri (₺${fmt(a.otherMarketing)}) hariç tutuldu; referansta yoktu.`);
      if (f.unknownGateway) out.push(`${f.unknownGateway} siparişte tanınmayan ödeme yöntemi var (varsayılan komisyon uygulandı).`);
      break;
  }
  return out;
}

export function validationReport(): MonthCompare[] {
  const refs = getDb()
    .$client.prepare("select month, orders, net_revenue netRevenue, meta_spend metaSpend, cogs, post_ad_profit postAdProfit from validation_reference order by month")
    .all() as ({ month: string } & Record<Metric, number>)[];
  const refEnd = referenceEnd();
  const actual = monthlyActuals(refEnd ?? undefined);
  return refs.map((ref) => {
    const a = actual.get(ref.month);
    const f = monthFacts(ref.month);
    const ours: Record<Metric, number> = {
      orders: a?.orders ?? 0,
      netRevenue: a?.netRevenue ?? 0,
      metaSpend: a?.metaSpend ?? 0,
      cogs: a?.cogs ?? 0,
      postAdProfit: (a?.postAdProfit ?? 0) + (a?.otherMarketing ?? 0),
    };
    const values = {} as MonthCompare["values"];
    const reasons: string[] = [];
    for (const m of Object.keys(TOLERANCES) as Metric[]) {
      const diff = ref[m] ? (ours[m] - ref[m]) / Math.abs(ref[m]) : null;
      const ok = diff !== null && Math.abs(diff) <= TOLERANCES[m];
      values[m] = { ours: ours[m], ref: ref[m], diff, ok };
      if (!ok) reasons.push(`${METRIC_LABELS[m]}: ` + explain(ref.month, m, ours[m], ref[m], a, f, refEnd).join(" "));
    }
    return { month: ref.month, values, allOk: reasons.length === 0, reasons, hasData: !!a && (a.orders > 0 || a.netRevenue !== 0) };
  });
}
