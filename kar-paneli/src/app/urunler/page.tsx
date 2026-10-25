import Link from "next/link";
import { Card, Note, PageHeader } from "@/components/ui";
import { ParamSelect, PeriodPicker } from "@/components/PeriodPicker";
import { getDb } from "@/lib/db";
import { readParams, type SP } from "@/lib/pageparams";
import { num, pct, tl } from "@/lib/format";
import { trDate } from "@/lib/time";

export const dynamic = "force-dynamic";

const CATS = [
  { key: "", label: "Tümü" },
  { key: "bileklik", label: "Bileklik" },
  { key: "kolye", label: "Kolye" },
  { key: "charm", label: "Charm" },
  { key: "künye", label: "Künye" },
  { key: "klasik", label: "Klasik" },
  { key: "ek_ürün", label: "Ek ürün" },
  { key: "event", label: "Event/dijital" },
];
const MATS = [
  { key: "", label: "Tümü" },
  { key: "çelik", label: "Çelik" },
  { key: "gümüş", label: "Gümüş" },
];

interface Row {
  code: string | null;
  name: string | null;
  category: string | null;
  material: string | null;
  units: number;
  revenue: number;
  discount: number;
  cogs: number;
  ship: number;
  comm: number;
  kdv: number;
  ru: number;
  ra: number;
  rcb: number;
  rkb: number;
  rcm: number;
}

export default async function Urunler({ searchParams }: { searchParams: SP }) {
  const { range, s } = await readParams(searchParams);
  const cat = s("kat") ?? "";
  const mat = s("mlz") ?? "";
  const where = ["l.date between ? and ?"];
  const args: string[] = [range.from, range.to];
  if (cat) {
    where.push("m.category = ?");
    args.push(cat);
  }
  if (mat) {
    where.push("m.material = ?");
    args.push(mat);
  }
  const rows = getDb()
    .$client.prepare(
      `select l.model_code code, m.name, m.category, m.material, sum(l.units) units, sum(l.revenue) revenue, sum(l.discount) discount,
              sum(l.cogs) cogs, sum(l.shipping_cost) ship, sum(l.commission) comm, sum(l.kdv) kdv, sum(l.refunded_units) ru,
              sum(l.refund_amount) ra, sum(l.refund_cogs_back) rcb, sum(l.refund_kdv_back) rkb, sum(l.refund_commission_back) rcm
         from line_calc l left join models m on m.code = l.model_code
        where ${where.join(" and ")} group by l.model_code order by revenue desc`,
    )
    .all(...args) as Row[];
  const profit = (r: Row) => r.revenue - r.ra - (r.cogs - r.rcb) - r.ship - (r.comm - r.rcm) - (r.kdv - r.rkb);
  const tot = rows.reduce(
    (a, r) => ({ units: a.units + r.units, revenue: a.revenue + r.revenue, discount: a.discount + r.discount, cogs: a.cogs + r.cogs, profit: a.profit + profit(r), ru: a.ru + r.ru }),
    { units: 0, revenue: 0, discount: 0, cogs: 0, profit: 0, ru: 0 },
  );

  return (
    <div className="space-y-5">
      <PageHeader title="Ürünler" sub={`Model bazında · ${range.label}: ${trDate(range.from)} – ${trDate(range.to)}`}>
        <PeriodPicker
          showCompare={false}
          extra={
            <>
              <ParamSelect name="kat" label="Kategori" value={cat} options={CATS} />
              <ParamSelect name="mlz" label="Malzeme" value={mat} options={MATS} />
            </>
          }
        />
      </PageHeader>
      <Note>
        Bu ekranda iadeler siparişin tarihine bağlanır. Siparişteki toplam indirim satırlara liste fiyatına oranla, kargo/komisyon/KDV satır cirosuna oranla dağıtılır; böylece couple&apos;daki 2. ürün haksız yere zararlı görünmez. Set ürünler parçalarına (maliyet oranında) bölünür.
      </Note>
      <Card>
        <div className="overflow-x-auto">
          <table className="tbl num">
            <thead>
              <tr>
                <th>Model</th>
                <th>Kategori</th>
                <th>Malzeme</th>
                <th className="text-right">Adet</th>
                <th className="text-right">Satır cirosu</th>
                <th className="text-right">İndirim</th>
                <th className="text-right">Ürün maliyeti</th>
                <th className="text-right">Reklam öncesi kâr</th>
                <th className="text-right">Ort. satış fiyatı</th>
                <th className="text-right">İade adedi</th>
                <th className="text-right">İade oranı</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code ?? "yok"}>
                  <td className="font-medium">
                    {r.code ? (
                      <Link href={`/urunler/${encodeURIComponent(r.code)}`} className="text-accent hover:underline">
                        {r.name}
                      </Link>
                    ) : (
                      <Link href="/maliyetler#eslesmeyenler" className="text-neg hover:underline">
                        Eşleşmeyen ürünler
                      </Link>
                    )}
                  </td>
                  <td>{r.category}</td>
                  <td>{r.material === "-" ? "" : r.material}</td>
                  <td className="text-right">{num(r.units)}</td>
                  <td className="text-right">{tl(r.revenue)}</td>
                  <td className="text-right">{tl(r.discount)}</td>
                  <td className="text-right">{tl(r.cogs - r.rcb)}</td>
                  <td className={`text-right ${profit(r) < 0 ? "text-neg" : ""}`}>{tl(profit(r))}</td>
                  <td className="text-right">{tl(r.units ? r.revenue / r.units : null)}</td>
                  <td className="text-right">{num(r.ru)}</td>
                  <td className="text-right">{pct(r.units ? r.ru / r.units : null)}</td>
                </tr>
              ))}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={3}>Toplam</td>
                  <td className="text-right">{num(tot.units)}</td>
                  <td className="text-right">{tl(tot.revenue)}</td>
                  <td className="text-right">{tl(tot.discount)}</td>
                  <td className="text-right">—</td>
                  <td className="text-right">{tl(tot.profit)}</td>
                  <td className="text-right">{tl(tot.units ? tot.revenue / tot.units : null)}</td>
                  <td className="text-right">{num(tot.ru)}</td>
                  <td className="text-right">{pct(tot.units ? tot.ru / tot.units : null)}</td>
                </tr>
              </tfoot>
            )}
          </table>
          {rows.length === 0 && <p className="p-3 text-sm text-muted">Bu dönemde satış yok.</p>}
        </div>
      </Card>
    </div>
  );
}
