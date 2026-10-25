import { Fragment } from "react";
import { Card, PageHeader } from "@/components/ui";
import { ParamSelect, PeriodPicker } from "@/components/PeriodPicker";
import { readParams, GRAIN_OPTIONS, type SP } from "@/lib/pageparams";
import { PNL_ROWS, pnlMatrix } from "@/lib/pnlTable";
import { tl, num } from "@/lib/format";
import { trDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function KarTablosu({ searchParams }: { searchParams: SP }) {
  const { range, grain, q } = await readParams(searchParams);
  const { cols, total, needRecon, recon } = pnlMatrix(range.from, range.to, grain);
  const tooMany = cols.length > 120;
  const qs = new URLSearchParams(Object.entries(q).filter(([, v]) => typeof v === "string") as [string, string][]);
  qs.set("g", grain);
  const fmt = (v: number, kind: string) => (kind === "count" ? num(v) : tl(v));

  return (
    <div className="space-y-5">
      <PageHeader title="Kâr tablosu" sub={`${range.label}: ${trDate(range.from)} – ${trDate(range.to)}. İadeler, paranın geri gittiği güne yazılır.`}>
        <PeriodPicker showCompare={false} extra={<ParamSelect name="g" label="Kırılım" value={grain} options={GRAIN_OPTIONS} />} />
      </PageHeader>
      <div className="flex gap-2">
        <a className="btn" href={`/api/disa-aktar?${qs.toString()}&bicim=xlsx`}>
          Excel (.xlsx) indir
        </a>
        <a className="btn" href={`/api/disa-aktar?${qs.toString()}&bicim=csv`}>
          CSV indir
        </a>
      </div>
      <Card>
        {tooMany ? (
          <p className="text-sm text-muted">Bu dönemde {cols.length} sütun var. Daha okunur olması için kırılımı hafta ya da ay seçin.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl num">
              <thead>
                <tr>
                  <th className="sticky left-0 z-10 bg-surface">Kalem</th>
                  {cols.map((c) => (
                    <th key={c.key} className="text-right">
                      {c.label}
                    </th>
                  ))}
                  <th className="text-right text-ink">Toplam</th>
                </tr>
              </thead>
              <tbody>
                {PNL_ROWS.map((r) => (
                  <Fragment key={r.label}>
                    <tr className={r.kind === "total" ? "bg-surface-2 font-semibold" : r.kind === "count" ? "text-ink-2" : ""}>
                      <td className={`sticky left-0 z-10 whitespace-nowrap ${r.kind === "total" ? "bg-surface-2" : "bg-surface"}`}>
                        {r.sign && <span className="mr-1 text-muted">{r.sign === "-" ? "−" : "+"}</span>}
                        {r.kind === "total" && <span className="mr-1 text-muted">=</span>}
                        {r.label}
                      </td>
                      {cols.map((c) => (
                        <td key={c.key} className={`text-right whitespace-nowrap ${r.kind === "total" && c.values[r.field!] < 0 ? "text-neg" : ""}`}>
                          {fmt(c.values[r.field!], r.kind)}
                        </td>
                      ))}
                      <td className={`text-right font-medium whitespace-nowrap ${r.kind === "total" && total[r.field!] < 0 ? "text-neg" : ""}`}>{fmt(total[r.field!], r.kind)}</td>
                    </tr>
                    {r.field === "shipping_charged" && needRecon && (
                      <tr className="text-ink-2">
                        <td className="sticky left-0 bg-surface whitespace-nowrap">
                          <span className="mr-1 text-muted">±</span>Diğer (bahşiş, hediye çeki, yuvarlama)
                        </td>
                        {cols.map((c) => (
                          <td key={c.key} className="text-right">
                            {tl(recon(c.values))}
                          </td>
                        ))}
                        <td className="text-right">{tl(recon(total))}</td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
