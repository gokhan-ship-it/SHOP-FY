import { Card, Label, Note, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { getDb } from "@/lib/db";
import { monthlyEquivalent } from "@/lib/calc/fixed";
import { loadFxLookup } from "@/lib/fx";
import { loadContext } from "@/lib/calc/recalc";
import { tl, num } from "@/lib/format";
import { todayIst, trDate } from "@/lib/time";
import { closeFixedCostAction, deleteFixedCostAction, deleteShipmentAction, saveFixedCostAction, saveShipmentAction } from "../actions";

export const dynamic = "force-dynamic";

const CATS = {
  sirket: ["Altyapı (AWS)", "Shopify", "Yazılım/abonelik", "Muhasebe", "Personel", "Reklam ajansı", "Kreatif", "Ofis", "Diğer"],
  kisisel: ["Kira", "Yaşam", "Diğer"],
};
const FREQ: Record<string, string> = { aylik: "Aylık", yillik: "Yıllık", haftalik: "Haftalık", tek: "Tek seferlik" };

interface FC {
  id: number;
  section: string;
  name: string;
  category: string | null;
  amount: number;
  currency: string;
  frequency: string;
  spread_months: number | null;
  start_date: string;
  end_date: string | null;
  note: string | null;
}

function FixedForm({ section, row }: { section: "sirket" | "kisisel"; row?: FC }) {
  const today = todayIst();
  return (
    <form action={saveFixedCostAction} className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
      <input type="hidden" name="section" value={section} />
      {row && <input type="hidden" name="id" value={row.id} />}
      <label className="col-span-2">
        <Label>Kalem adı</Label>
        <input name="name" required className="field" defaultValue={row?.name} placeholder={section === "sirket" ? "ör. AWS" : "ör. Ev kirası"} />
      </label>
      <label className="col-span-2 sm:col-span-1 lg:col-span-1">
        <Label>Kategori</Label>
        <input name="category" list={`cats-${section}`} className="field" defaultValue={row?.category ?? ""} />
        <datalist id={`cats-${section}`}>
          {CATS[section].map((c) => (
            <option key={c} value={c} />
          ))}
        </datalist>
      </label>
      <label>
        <Label>Tutar</Label>
        <input name="amount" required inputMode="decimal" className="field num" defaultValue={row?.amount} placeholder="0" />
      </label>
      <label>
        <Label>Para birimi</Label>
        <select name="currency" className="field" defaultValue={row?.currency ?? "TRY"}>
          <option value="TRY">TL</option>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>
      <label>
        <Label>Sıklık</Label>
        <select name="frequency" className="field" defaultValue={row?.frequency ?? "aylik"}>
          {Object.entries(FREQ).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Label hint="tek seferlikte">Kaç aya yayılsın</Label>
        <input name="spreadMonths" type="number" min={1} className="field num" defaultValue={row?.spread_months ?? ""} placeholder="1" />
      </label>
      <label>
        <Label>Başlangıç</Label>
        <input name="startDate" type="date" required className="field" defaultValue={row?.start_date ?? today.slice(0, 8) + "01"} />
      </label>
      <label>
        <Label hint="boş = sürüyor">Bitiş</Label>
        <input name="endDate" type="date" className="field" defaultValue={row?.end_date ?? ""} />
      </label>
      <label className="col-span-2 sm:col-span-3 lg:col-span-5">
        <Label>Not</Label>
        <input name="note" className="field" defaultValue={row?.note ?? ""} />
      </label>
      <div className="col-span-2 flex items-end sm:col-span-1">
        <button className="btn-primary w-full">{row ? "Kaydet" : "Ekle"}</button>
      </div>
    </form>
  );
}

function Section({ section, rows, fx }: { section: "sirket" | "kisisel"; rows: FC[]; fx: (c: string, d: string) => number | null }) {
  const today = todayIst();
  const active = rows.filter((r) => (r.frequency === "tek" ? true : !r.end_date || r.end_date >= today) && r.start_date <= today);
  const toTl = (r: FC) => (r.currency === "TRY" ? 1 : (fx(r.currency, today) ?? 0));
  const monthly = active.filter((r) => r.frequency !== "tek" || (r.spread_months ?? 1) > 1).reduce((s, r) => s + monthlyEquivalent({ frequency: r.frequency, amount: r.amount, spreadMonths: r.spread_months }) * toTl(r), 0);
  return (
    <Card
      title={section === "sirket" ? "Şirket giderleri" : "Kişisel giderler"}
      action={
        <span className="text-sm">
          Aylık toplam: <span className="num font-semibold">{tl(monthly)}</span>
        </span>
      }
    >
      {rows.length === 0 ? (
        <p className="mb-4 text-sm text-muted">Henüz kalem yok. Aşağıdan ekleyin.</p>
      ) : (
        <div className="mb-5 overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Kalem</th>
                <th>Kategori</th>
                <th className="text-right">Tutar</th>
                <th>Sıklık</th>
                <th className="text-right">Aylık karşılığı</th>
                <th>Başlangıç</th>
                <th>Bitiş</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const closed = r.end_date && r.end_date < today;
                return (
                  <tr key={r.id} className={closed ? "text-muted" : ""}>
                    <td>
                      <div className="font-medium">{r.name}</div>
                      {r.note && <div className="text-xs text-muted">{r.note}</div>}
                    </td>
                    <td>{r.category}</td>
                    <td className="num text-right whitespace-nowrap">
                      {num(r.amount)} {r.currency === "TRY" ? "₺" : r.currency}
                    </td>
                    <td>
                      {FREQ[r.frequency]}
                      {r.frequency === "tek" && (r.spread_months ?? 1) > 1 && ` · ${r.spread_months} aya`}
                    </td>
                    <td className="num text-right">{r.frequency === "tek" && (r.spread_months ?? 1) <= 1 ? "—" : tl(monthlyEquivalent({ frequency: r.frequency, amount: r.amount, spreadMonths: r.spread_months }) * toTl(r))}</td>
                    <td className="whitespace-nowrap">{trDate(r.start_date)}</td>
                    <td className="whitespace-nowrap">{r.end_date ? trDate(r.end_date) : "sürüyor"}</td>
                    <td>
                      <details className="relative">
                        <summary className="btn cursor-pointer list-none !py-1 text-xs">Düzenle</summary>
                        <div className="mt-2 w-[min(90vw,900px)] space-y-3 rounded-lg border border-line bg-surface p-3 shadow-lg sm:absolute sm:right-0 sm:z-30">
                          <FixedForm section={section} row={r} />
                          <div className="flex flex-wrap gap-2 border-t border-line pt-3">
                            <form action={closeFixedCostAction} className="flex items-end gap-2">
                              <input type="hidden" name="id" value={r.id} />
                              <label>
                                <Label>Kapat (bitiş tarihi)</Label>
                                <input type="date" name="endDate" defaultValue={today} className="field" />
                              </label>
                              <button className="btn">Kapat</button>
                            </form>
                            <form action={deleteFixedCostAction} className="ml-auto flex items-end">
                              <input type="hidden" name="id" value={r.id} />
                              <button className="btn-danger">Sil</button>
                            </form>
                          </div>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <details>
        <summary className="btn cursor-pointer list-none">+ Yeni {section === "sirket" ? "şirket" : "kişisel"} gideri</summary>
        <div className="mt-3">
          <FixedForm section={section} />
        </div>
      </details>
    </Card>
  );
}

export default async function Giderler({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const c = getDb().$client;
  const rows = c.prepare("select * from fixed_costs order by section, coalesce(end_date, '9999') desc, name").all() as FC[];
  const fx = loadFxLookup();
  const models = c.prepare("select code, name, category, material from models where active = 1 order by category, name").all() as { code: string; name: string; category: string; material: string | null }[];
  const ctx = loadContext();
  const ships = c.prepare("select * from marketing_shipments order by date desc, id desc").all() as { id: number; date: string; model_code: string; qty: number; person_note: string | null; with_shipping: number }[];
  const modelName = new Map(models.map((m) => [m.code, `${m.name} (${m.material ?? m.category})`]));
  const today = todayIst();

  return (
    <div className="space-y-5">
      <PageHeader title="Giderler" sub="Sabit giderler günlere dağıtılarak kâr tablosuna yazılır. USD/EUR giderler o günün TCMB kuruyla çevrilir." />
      <Flash q={q} />
      <Section section="sirket" rows={rows.filter((r) => r.section === "sirket")} fx={fx} />
      <Section section="kisisel" rows={rows.filter((r) => r.section === "kisisel")} fx={fx} />

      <Card id="gonderimler" title="Ürün gönderimleri (UGC / hediye)">
        <Note>Shopify dışında yapılan gönderimler. Maliyet = model maliyeti × adet (+ kargo varsa ₺{num(ctx.shippingCost(today))}). “Diğer pazarlama” satırına yazılır.</Note>
        <form action={saveShipmentAction} className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-6">
          <label>
            <Label>Tarih</Label>
            <input type="date" name="date" required defaultValue={today} className="field" />
          </label>
          <label className="col-span-2">
            <Label>Model</Label>
            <select name="modelCode" required className="field">
              <option value="">Seçin…</option>
              {models.map((m) => (
                <option key={m.code} value={m.code}>
                  {modelName.get(m.code)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <Label>Adet</Label>
            <input type="number" name="qty" min={1} defaultValue={1} className="field num" />
          </label>
          <label className="col-span-2">
            <Label>Kişi / not</Label>
            <input name="personNote" className="field" placeholder="ör. @kullanici, UGC" />
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="withShipping" defaultChecked /> Kargo var
          </label>
          <div className="flex items-end">
            <button className="btn-primary">Ekle</button>
          </div>
        </form>
        {ships.length > 0 && (
          <div className="mt-5 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Tarih</th>
                  <th>Model</th>
                  <th className="text-right">Adet</th>
                  <th>Kişi / not</th>
                  <th>Kargo</th>
                  <th className="text-right">Maliyet</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {ships.map((s) => (
                  <tr key={s.id}>
                    <td className="whitespace-nowrap">{trDate(s.date)}</td>
                    <td>{modelName.get(s.model_code) ?? s.model_code}</td>
                    <td className="num text-right">{s.qty}</td>
                    <td>{s.person_note}</td>
                    <td>{s.with_shipping ? "Var" : "Yok"}</td>
                    <td className="num text-right">{tl((ctx.unitCost(s.model_code, s.date) ?? 0) * s.qty + (s.with_shipping ? ctx.shippingCost(s.date) : 0))}</td>
                    <td>
                      <form action={deleteShipmentAction}>
                        <input type="hidden" name="id" value={s.id} />
                        <button className="btn-danger !py-1 text-xs">Sil</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
