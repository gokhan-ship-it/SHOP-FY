import { Card, Delta, Note, PageHeader } from "@/components/ui";
import { PeriodPicker, ParamSelect } from "@/components/PeriodPicker";
import { RevenueChart } from "@/components/charts";
import { derive, monthEndForecast, pctChange, series, totals, type Totals } from "@/lib/metrics";
import { readParams, bucketLabel, GRAIN_OPTIONS, type SP } from "@/lib/pageparams";
import { dec, pct, tl, num } from "@/lib/format";
import { trDate, monthLabel } from "@/lib/time";

export const dynamic = "force-dynamic";

function Kpi({ label, value, delta, goodWhenUp = true, hint, big }: { label: string; value: string; delta?: number | null; goodWhenUp?: boolean; hint?: string; big?: boolean }) {
  return (
    <div className={`rounded-xl border border-line bg-surface ${big ? "p-4" : "p-3"}`} title={hint}>
      <div className="text-xs text-muted">{label}</div>
      <div className={`mt-1 font-semibold tracking-tight text-ink ${big ? "text-2xl" : "text-lg"}`}>{value}</div>
      {delta !== undefined && (
        <div className="mt-0.5">
          <Delta value={delta ?? null} goodWhenUp={goodWhenUp} />
        </div>
      )}
    </div>
  );
}

export default async function Home({ searchParams }: { searchParams: SP }) {
  const { range, cmp, grain } = await readParams(searchParams);
  const t = totals(range.from, range.to);
  const d = derive(t);
  const pt: Totals | null = cmp ? totals(cmp.from, cmp.to) : null;
  const pd = pt ? derive(pt) : null;
  const ch = (a: number | null, b: number | null | undefined) => (pt ? pctChange(a, b ?? null) : undefined);
  const fc = monthEndForecast();
  const s = series(range.from, range.to, grain).map((b) => ({ label: bucketLabel(b.key, grain), ciro: Math.round(b.net_revenue), reklam: Math.round(b.meta_spend + b.other_marketing), kar: Math.round(b.post_ad_profit) }));

  const costs = [
    { label: "Ürün maliyeti", v: t.cogs },
    { label: "Meta reklam", v: t.meta_spend },
    { label: "Şirket sabit giderleri", v: t.fixed_company },
    { label: "Kargo", v: t.shipping_cost },
    { label: "Komisyon", v: t.commission },
    { label: "KDV (işçilik)", v: t.kdv },
    { label: "Diğer pazarlama (UGC/hediye)", v: t.other_marketing },
  ].sort((a, b) => b.v - a.v);
  const maxCost = Math.max(1, ...costs.map((c) => c.v));

  return (
    <div className="space-y-5">
      <PageHeader title="Ana ekran" sub={`${range.label}: ${trDate(range.from)} – ${trDate(range.to)}${cmp ? ` · karşılaştırma ${trDate(cmp.from)} – ${trDate(cmp.to)}` : ""}`}>
        <PeriodPicker />
      </PageHeader>

      {t.metaTpDays > 0 && <Note>Bu dönemin {t.metaTpDays} gününde reklam harcaması Meta yerine TrueProfit aylık yedeğinden geliyor (günlere eşit bölünmüş).</Note>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi big label="Net ciro" value={tl(t.net_revenue)} delta={ch(t.net_revenue, pt?.net_revenue)} hint="Ciro − iadeler" />
        <Kpi big label="Meta reklam" value={tl(t.meta_spend)} delta={ch(t.meta_spend, pt?.meta_spend)} goodWhenUp={false} />
        <Kpi big label="Reklam sonrası kâr" value={tl(t.post_ad_profit)} delta={ch(t.post_ad_profit, pt?.post_ad_profit)} />
        <Kpi big label="Şirket net kârı" value={tl(t.company_net)} delta={ch(t.company_net, pt?.company_net)} hint="Reklam sonrası kâr − şirket sabit giderleri" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Sipariş" value={num(t.orders)} delta={ch(t.orders, pt?.orders)} hint="DTC sipariş (event ve 0 ₺ hariç)" />
        <Kpi label="Ortalama sepet" value={tl(d.aov)} delta={ch(d.aov, pd?.aov)} />
        <Kpi label="ROAS" value={dec(d.roas)} delta={ch(d.roas, pd?.roas)} hint="Net ciro ÷ Meta reklam" />
        <Kpi label="Reklam / sipariş" value={tl(d.cac)} delta={ch(d.cac, pd?.cac)} goodWhenUp={false} hint="Meta reklam ÷ sipariş" />
        <Kpi label="Kâr / sipariş" value={tl(d.profitPerOrder)} delta={ch(d.profitPerOrder, pd?.profitPerOrder)} hint="Reklam sonrası kâr ÷ sipariş" />
        <Kpi label="Marj" value={pct(d.margin)} delta={ch(d.margin, pd?.margin)} hint="Reklam sonrası kâr ÷ net ciro" />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Kpi label="Başabaş ROAS" value={dec(d.breakevenRoas)} delta={ch(d.breakevenRoas, pd?.breakevenRoas)} goodWhenUp={false} hint="Net ciro ÷ reklam öncesi kâr. ROAS bunun altına düşerse reklam zarar ettirir." />
        <Kpi label="Sipariş başı reklam tavanı" value={tl(d.adCeilingPerOrder)} delta={ch(d.adCeilingPerOrder, pd?.adCeilingPerOrder)} hint="Reklam öncesi kâr ÷ sipariş. Sipariş başına bundan fazla reklam harcanırsa zarar." />
        <Kpi label="Ürün maliyeti %" value={pct(d.cogsPct)} delta={ch(d.cogsPct, pd?.cogsPct)} goodWhenUp={false} />
        <Kpi label="İndirim %" value={pct(d.discountPct)} delta={ch(d.discountPct, pd?.discountPct)} goodWhenUp={false} />
        <Kpi label="Couple oranı" value={pct(d.coupleRate)} delta={ch(d.coupleRate, pd?.coupleRate)} hint="2 ya da daha fazla kapsüllü sipariş ÷ sipariş" />
        <Kpi label="İade %" value={pct(d.refundPct)} delta={ch(d.refundPct, pd?.refundPct)} goodWhenUp={false} />
      </div>

      <Card title="Ciro, reklam ve kâr" action={<ParamSelect name="g" label="" value={grain} options={GRAIN_OPTIONS} />}>
        {s.length ? <RevenueChart data={s} /> : <p className="text-sm text-muted">Bu dönem için veri yok.</p>}
        <p className="mt-2 text-xs text-muted">Çubuk: net ciro. Çizgiler: Meta reklam (+ UGC/hediye) ve reklam sonrası kâr. Hepsi TL, tek eksen.</p>
      </Card>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card title="Maliyet dağılımı" className="lg:col-span-2">
          <ul className="space-y-2">
            {costs.map((c) => (
              <li key={c.label} className="grid grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 text-sm sm:grid-cols-[14rem_1fr_auto]">
                <span className="truncate text-ink-2">{c.label}</span>
                <span className="h-2.5 rounded-full bg-surface-2" aria-hidden>
                  <span className="block h-2.5 rounded-full bg-[var(--s1)]" style={{ width: `${Math.max(0, (c.v / maxCost) * 100)}%` }} />
                </span>
                <span className="num w-40 text-right">
                  {tl(c.v)} <span className="text-xs text-muted">{t.net_revenue ? pct(c.v / t.net_revenue) : ""}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-muted">Yüzdeler net ciroya oranla.</p>
        </Card>

        <Card title={`Ay sonu tahmini (${monthLabel(fc.month)})`}>
          <div className="text-2xl font-semibold tracking-tight">{tl(fc.forecast)}</div>
          <div className="mt-1 text-xs text-muted">Şirket net kârı tahmini</div>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-2"><dt className="text-ink-2">Gerçekleşen şirket net kârı</dt><dd className="num">{tl(fc.realized)}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-2">Son 7 gün ort. reklam sonrası kâr</dt><dd className="num">{tl(fc.avgDaily)}/gün</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-2">Kalan gün</dt><dd className="num">{fc.remainingDays}</dd></div>
            <div className="flex justify-between gap-2"><dt className="text-ink-2">Kalan günlerin sabit gideri</dt><dd className="num">−{tl(fc.remainingFixed)}</dd></div>
          </dl>
        </Card>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm">
        <span className="text-ink-2">
          Sana kalan <span className="text-xs text-muted">(şirket net kârı − kişisel giderler)</span>
        </span>
        <span className="num font-medium">
          {tl(t.take_home)} <Delta value={ch(t.take_home, pt?.take_home) ?? null} />
        </span>
      </div>
    </div>
  );
}
