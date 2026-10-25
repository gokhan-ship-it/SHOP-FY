import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, PageHeader } from "@/components/ui";
import { PriceChart, UnitsChart } from "@/components/charts";
import { getDb } from "@/lib/db";
import { num, tl } from "@/lib/format";
import { addMonths, monthLabel, monthStart, todayIst, trDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function ModelDetay({ params }: { params: Promise<{ kod: string }> }) {
  const { kod } = await params;
  const code = decodeURIComponent(kod);
  const c = getDb().$client;
  const m = c.prepare("select * from models where code = ?").get(code) as { code: string; name: string; category: string; material: string | null } | undefined;
  if (!m) notFound();
  const from = addMonths(monthStart(todayIst()), -23);
  const monthly = c
    .prepare(
      `select substr(date,1,7) ym, sum(units) units, sum(list_amount) list, sum(revenue) rev from line_calc where model_code = ? and date >= ? group by 1 order by 1`,
    )
    .all(code, from) as { ym: string; units: number; list: number; rev: number }[];
  const months: string[] = [];
  for (let d = from; d <= todayIst(); d = addMonths(d, 1)) months.push(d.slice(0, 7));
  const byM = new Map(monthly.map((x) => [x.ym, x]));
  const units = months.map((ym) => ({ label: monthLabel(ym, true), adet: Math.round(byM.get(ym)?.units ?? 0) }));
  const prices = months.map((ym) => {
    const x = byM.get(ym);
    return { label: monthLabel(ym, true), fiyat: x?.units ? Math.round(x.list / x.units) : null, satis: x?.units ? Math.round(x.rev / x.units) : null };
  });
  const versions = c.prepare("select * from cost_versions where model_code = ? order by valid_from desc").all(code) as { id: number; unit_cost: number | null; valid_from: string; valid_to: string | null; breakdown: string | null; note: string | null }[];
  const variants = c
    .prepare(
      `select distinct v.id, p.title ptitle, v.title vtitle, v.price, v.compare_at_price cap, p.status from variants v join products p on p.id = v.product_id
        where v.id in (select ol.variant_id from line_calc l join order_lines ol on ol.id = l.line_id where l.model_code = ?)
        order by p.status, p.title`,
    )
    .all(code) as { id: string; ptitle: string; vtitle: string; price: number | null; cap: number | null; status: string }[];
  const events = variants.length
    ? (c
        .prepare(`select date, title, detail from events where variant_id in (${variants.map(() => "?").join(",")}) order by date desc limit 30`)
        .all(...variants.map((v) => v.id)) as { date: string; title: string; detail: string | null }[])
    : [];

  return (
    <div className="space-y-5">
      <PageHeader title={m.name} sub={`${m.category}${m.material && m.material !== "-" ? " · " + m.material : ""}`}>
        <Link href="/urunler" className="btn">
          ← Ürünler
        </Link>
      </PageHeader>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Aylık satış adedi (son 24 ay)">
          <UnitsChart data={units} />
        </Card>
        <Card title="Fiyat geçmişi (siparişlerden, aylık ortalama)">
          <PriceChart data={prices} />
        </Card>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Maliyet sürümleri">
          <table className="tbl">
            <thead>
              <tr>
                <th className="text-right">Birim maliyet</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th>Not</th>
              </tr>
            </thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id}>
                  <td className="num text-right">{v.unit_cost == null ? "—" : tl(v.unit_cost, true)}</td>
                  <td>{trDate(v.valid_from)}</td>
                  <td>{v.valid_to ? trDate(v.valid_to) : "sürüyor"}</td>
                  <td className="text-xs">
                    {v.breakdown} <span className="text-muted">{v.note}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link href="/maliyetler" className="mt-3 inline-block text-sm text-accent hover:underline">
            Maliyeti değiştir →
          </Link>
        </Card>
        <Card title="Shopify'daki güncel fiyatlar">
          {variants.length === 0 ? (
            <p className="text-sm text-muted">Shopify ürün senkronu tamamlanınca burada görünür.</p>
          ) : (
            <table className="tbl">
              <thead>
                <tr>
                  <th>Ürün / varyant</th>
                  <th>Durum</th>
                  <th className="text-right">Fiyat</th>
                  <th className="text-right">İndirimsiz</th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v) => (
                  <tr key={v.id}>
                    <td>
                      {v.ptitle}
                      {v.vtitle && v.vtitle !== "Default Title" ? ` / ${v.vtitle}` : ""}
                    </td>
                    <td className="text-xs">{v.status === "ACTIVE" ? "aktif" : v.status === "DRAFT" ? "taslak" : "arşiv"}</td>
                    <td className="num text-right">{tl(v.price)}</td>
                    <td className="num text-right">{tl(v.cap)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {events.length > 0 && (
            <div className="mt-4">
              <div className="mb-1 text-xs font-medium text-ink-2">Fiyat değişiklikleri</div>
              <ul className="space-y-1 text-sm">
                {events.map((e, i) => (
                  <li key={i}>
                    <span className="text-muted">{trDate(e.date)}</span> {e.title} <span className="num">{e.detail}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
      <p className="text-xs text-muted">Toplam satılan: {num(monthly.reduce((s, x) => s + x.units, 0))} adet (son 24 ay)</p>
    </div>
  );
}
