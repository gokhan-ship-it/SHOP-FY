import Link from "next/link";
import { Card, Label, Note, PageHeader } from "@/components/ui";
import { Flash } from "@/components/Flash";
import { getDb } from "@/lib/db";
import { num, tl } from "@/lib/format";
import { todayIst, trDate } from "@/lib/time";
import { addCostVersionAction, addRuleAction, createModelAction, deleteCostVersionAction, setMappingAction, updateModelAction } from "../actions";

export const dynamic = "force-dynamic";

const CATEGORIES = ["bileklik", "kolye", "charm", "künye", "klasik", "ek_ürün", "event"];
const CAT_LABEL: Record<string, string> = { bileklik: "Bileklik", kolye: "Kolye", charm: "Charm", künye: "Künye", klasik: "Klasik", ek_ürün: "Ek ürün", event: "Event/dijital" };

interface Model {
  code: string;
  name: string;
  category: string;
  material: string | null;
  active: number;
}
interface Version {
  id: number;
  model_code: string;
  unit_cost: number | null;
  valid_from: string;
  valid_to: string | null;
  breakdown: string | null;
  note: string | null;
}
interface RuleRow {
  id: number;
  type: string;
  unit: string;
  value: number;
  scope: string | null;
  note: string | null;
  valid_from: string;
  valid_to: string | null;
}

function ModelOptions({ models }: { models: Model[] }) {
  return (
    <>
      <option value="">Model seçin…</option>
      {CATEGORIES.map((cat) => (
        <optgroup key={cat} label={CAT_LABEL[cat]}>
          {models
            .filter((m) => m.category === cat)
            .map((m) => (
              <option key={m.code} value={m.code}>
                {m.name} {m.material && m.material !== "-" ? `(${m.material})` : ""}
              </option>
            ))}
        </optgroup>
      ))}
    </>
  );
}

function MappingForm({ keyType, keyValue, label, models, back = "/maliyetler" }: { keyType: string; keyValue: string; label: string; models: Model[]; back?: string }) {
  return (
    <form action={setMappingAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="keyType" value={keyType} />
      <input type="hidden" name="keyValue" value={keyValue} />
      <input type="hidden" name="label" value={label} />
      <input type="hidden" name="back" value={back} />
      {[0, 1].map((i) => (
        <div key={i} className="flex items-end gap-1">
          <label>
            <Label>{i === 0 ? "Model" : "2. parça (set ise)"}</Label>
            <select name="model" className="field !w-56" required={i === 0}>
              <ModelOptions models={models} />
            </select>
          </label>
          <label>
            <Label>Adet</Label>
            <input name="qty" type="number" min={1} defaultValue={1} className="field num !w-16" />
          </label>
        </div>
      ))}
      <button className="btn-primary">Eşleştir</button>
    </form>
  );
}

const RULE_GROUPS: { type: string; unit: string; title: string; valueLabel: string; scopes?: boolean; help: string }[] = [
  { type: "kargo", unit: "siparis_basi_tl", title: "Kargo", valueLabel: "Sipariş başı ₺", help: "İçinde fiziksel ürün olan her siparişe bir kez yazılır (couple dahil tek kargo)." },
  { type: "komisyon", unit: "yuzde", title: "Komisyon (ödeme yöntemine göre)", valueLabel: "Oran %", scopes: true, help: "Kapsam = ödeme yöntemi adı (büyük/küçük harf fark etmez). “*” = tanınmayan yöntemler için varsayılan." },
  { type: "kdv", unit: "yuzde", title: "KDV (kategoriye göre)", valueLabel: "Oran %", scopes: true, help: "Kapsam = kategoriler (virgülle). Takı: %0,8333 (işçilik), klasik ve event: %16,6667 (1/6)." },
  { type: "iade", unit: "komisyon_iade", title: "İadede komisyon geri gelir mi?", valueLabel: "1 = evet, 0 = hayır", help: "Şu an: komisyon geri gelmez." },
  { type: "iade", unit: "iade_kargo_tl", title: "İade kargosu", valueLabel: "İade başı ₺", help: "Şimdilik 0." },
];

export default async function Maliyetler({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const q = await searchParams;
  const c = getDb().$client;
  const today = todayIst();
  const models = c.prepare("select code, name, category, material, active from models order by category, name, material").all() as Model[];
  const versions = c.prepare("select * from cost_versions order by model_code, valid_from desc").all() as Version[];
  const byModel = new Map<string, Version[]>();
  for (const v of versions) byModel.set(v.model_code, [...(byModel.get(v.model_code) ?? []), v]);
  const current = (code: string) => byModel.get(code)?.find((v) => v.valid_from <= today && (!v.valid_to || v.valid_to >= today));
  const sold = new Map(
    (c.prepare("select model_code m, sum(units) u from line_calc where model_code is not null group by 1").all() as { m: string; u: number }[]).map((r) => [r.m, r.u]),
  );
  const rules = c.prepare("select * from rules order by type, unit, coalesce(scope,''), valid_from desc").all() as RuleRow[];

  const unmatched = c
    .prepare(
      `select ol.variant_id variantId, ol.product_id productId, ol.sku, ol.title, ol.variant_title variantTitle, ol.name,
              count(distinct ol.order_id) orders, sum(lc.units) units, sum(lc.revenue) revenue, min(lc.date) first, max(lc.date) last
         from line_calc lc join order_lines ol on ol.id = lc.line_id
        where lc.model_code is null
        group by coalesce(ol.variant_id, ol.product_id, ol.sku, ol.title)
        order by orders desc`,
    )
    .all() as { variantId: string | null; productId: string | null; sku: string | null; title: string; variantTitle: string | null; name: string | null; orders: number; units: number; revenue: number; first: string; last: string }[];

  const mappings = c
    .prepare(
      `select p.id, p.key_type keyType, p.key_value keyValue, p.label, p.source,
              group_concat(m.name || coalesce(' (' || m.material || ')', '') || ' ×' || pc.qty, ' + ') comps
         from product_map p join product_map_components pc on pc.map_id = p.id left join models m on m.code = pc.model_code
        group by p.id order by p.source, p.label`,
    )
    .all() as { id: number; keyType: string; keyValue: string; label: string | null; source: string; comps: string }[];

  const editId = Number(typeof q.esle === "string" ? q.esle : 0);
  const editing = editId ? mappings.find((m) => m.id === editId) : undefined;

  return (
    <div className="space-y-5">
      <PageHeader title="Maliyetler" sub="Her sipariş, sipariş tarihinde geçerli maliyet ve kurallarla hesaplanır. Değişiklikler geçmişe kendiliğinden uygulanır." />
      <Flash q={q} />

      <Card id="eslesmeyenler" title={`Eşleşmeyenler kutusu${unmatched.length ? ` (${unmatched.length})` : ""}`}>
        {unmatched.length === 0 ? (
          <Note tone="ok">Eşleşmeyen ürün yok. Tüm sipariş satırları bir modele bağlı.</Note>
        ) : (
          <div className="space-y-4">
            <Note tone="warn">Bu ürünler hiçbir modele bağlı değil; maliyetleri 0 sayılıyor. Model seçince geçmiş ve gelecek tüm siparişlere uygulanır. Set ürünse iki parçayı da seçin.</Note>
            {unmatched.map((u) => {
              const keyType = u.variantId ? "variant_id" : u.productId ? "product_id" : u.sku ? "sku" : "title";
              const keyValue = u.variantId ?? u.productId ?? u.sku ?? u.title;
              const label = u.name ?? `${u.title}${u.variantTitle ? " - " + u.variantTitle : ""}`;
              return (
                <div key={keyValue} className="rounded-lg border border-line p-3">
                  <div className="mb-2 flex flex-wrap justify-between gap-2">
                    <div>
                      <div className="font-medium">{label}</div>
                      <div className="text-xs text-muted">
                        {u.sku ? `SKU ${u.sku} · ` : ""}
                        {num(u.orders)} sipariş · {num(u.units)} adet · {tl(u.revenue)} · {trDate(u.first)} – {trDate(u.last)}
                      </div>
                    </div>
                  </div>
                  <MappingForm keyType={keyType} keyValue={keyValue} label={label} models={models} />
                </div>
              );
            })}
            <details>
              <summary className="btn cursor-pointer list-none">+ Listede olmayan yeni model aç</summary>
              <NewModelForm />
            </details>
          </div>
        )}
      </Card>

      <Card title="Model maliyetleri" action={<span className="text-xs text-muted">{models.length} model</span>}>
        <div className="overflow-x-auto">
          <table className="tbl">
            <thead>
              <tr>
                <th>Model</th>
                <th>Kategori</th>
                <th>Malzeme</th>
                <th className="text-right">Güncel birim maliyet</th>
                <th>Geçerlilik</th>
                <th className="text-right">Satılan adet</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {models.map((m) => {
                const cur = current(m.code);
                const vs = byModel.get(m.code) ?? [];
                const uncertain = vs.some((v) => v.note?.includes("2025 için kesin değil"));
                return (
                  <tr key={m.code} className={m.active ? "" : "text-muted"}>
                    <td>
                      <div className="font-medium">{m.name}</div>
                      {uncertain && <div className="text-xs text-warn-ink">⚠ 2025 maliyeti kesin değil (TrueProfit değeri; Şubat 2026'dan beri teyitli)</div>}
                      {cur?.breakdown && <div className="text-xs text-muted">{cur.breakdown}</div>}
                    </td>
                    <td>{CAT_LABEL[m.category] ?? m.category}</td>
                    <td>{m.material === "-" ? "" : m.material}</td>
                    <td className={`num text-right whitespace-nowrap ${cur?.unit_cost == null ? "font-medium text-neg" : ""}`}>{cur?.unit_cost == null ? "girilmemiş" : tl(cur.unit_cost, true)}</td>
                    <td className="whitespace-nowrap text-xs text-muted">{cur ? `${trDate(cur.valid_from)}'den beri` : "—"}</td>
                    <td className="num text-right">{num(sold.get(m.code) ?? 0)}</td>
                    <td>
                      <details className="relative">
                        <summary className="btn cursor-pointer list-none !py-1 text-xs">Sürümler ({vs.length})</summary>
                        <div className="mt-2 w-[min(92vw,760px)] space-y-4 rounded-lg border border-line bg-surface p-3 shadow-lg sm:absolute sm:right-0 sm:z-30">
                          <table className="tbl">
                            <thead>
                              <tr>
                                <th className="text-right">Birim maliyet</th>
                                <th>Başlangıç</th>
                                <th>Bitiş</th>
                                <th>Kırılım / not</th>
                                <th></th>
                              </tr>
                            </thead>
                            <tbody>
                              {vs.map((v) => (
                                <tr key={v.id}>
                                  <td className="num text-right">{v.unit_cost == null ? "—" : tl(v.unit_cost, true)}</td>
                                  <td className="whitespace-nowrap">{trDate(v.valid_from)}</td>
                                  <td className="whitespace-nowrap">{v.valid_to ? trDate(v.valid_to) : "sürüyor"}</td>
                                  <td className="text-xs">
                                    {v.breakdown}
                                    {v.breakdown && v.note ? " · " : ""}
                                    <span className="text-muted">{v.note}</span>
                                  </td>
                                  <td>
                                    {vs.length > 1 && (
                                      <form action={deleteCostVersionAction}>
                                        <input type="hidden" name="id" value={v.id} />
                                        <button className="btn-danger !px-2 !py-0.5 text-xs">Sil</button>
                                      </form>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          <form action={addCostVersionAction} className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-5">
                            <input type="hidden" name="modelCode" value={m.code} />
                            <label>
                              <Label>Yeni birim maliyet ₺</Label>
                              <input name="unitCost" inputMode="decimal" className="field num" placeholder="boş = bilinmiyor" />
                            </label>
                            <label>
                              <Label>Geçerlilik başlangıcı</Label>
                              <input name="validFrom" type="date" required defaultValue={today} className="field" />
                            </label>
                            <label className="col-span-2">
                              <Label>Kırılım / not</Label>
                              <input name="breakdown" className="field" placeholder="ör. gövde + charm + çip + kutu" />
                            </label>
                            <div className="flex items-end">
                              <button className="btn-primary w-full">Sürüm ekle</button>
                            </div>
                          </form>
                          <p className="text-xs text-muted">Önceki sürüm, yeni sürümün başlangıcından bir gün önce otomatik kapanır. Geçmiş bir tarih seçerseniz o tarihten sonraki siparişler kendiliğinden yeniden hesaplanır.</p>
                          <form action={updateModelAction} className="grid grid-cols-2 gap-2 border-t border-line pt-3 sm:grid-cols-5">
                            <input type="hidden" name="code" value={m.code} />
                            <label className="col-span-2">
                              <Label>Model adı</Label>
                              <input name="name" defaultValue={m.name} className="field" />
                            </label>
                            <label>
                              <Label>Kategori</Label>
                              <select name="category" defaultValue={m.category} className="field">
                                {CATEGORIES.map((x) => (
                                  <option key={x} value={x}>
                                    {CAT_LABEL[x]}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label>
                              <Label>Malzeme</Label>
                              <select name="material" defaultValue={m.material ?? "-"} className="field">
                                <option value="çelik">çelik</option>
                                <option value="gümüş">gümüş</option>
                                <option value="-">—</option>
                              </select>
                            </label>
                            <div className="flex items-end gap-2">
                              <label className="flex items-center gap-1 text-xs">
                                <input type="checkbox" name="active" defaultChecked={!!m.active} /> Aktif
                              </label>
                              <button className="btn">Kaydet</button>
                            </div>
                          </form>
                        </div>
                      </details>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <details className="mt-4">
          <summary className="btn cursor-pointer list-none">+ Yeni model</summary>
          <NewModelForm />
        </details>
      </Card>

      <Card id="kurallar" title="Kurallar (tarihli)">
        <div className="space-y-5">
          {RULE_GROUPS.map((g) => {
            const list = rules.filter((r) => r.type === g.type && r.unit === g.unit);
            return (
              <div key={g.type + g.unit} className="rounded-lg border border-line p-3">
                <div className="mb-1 font-medium">{g.title}</div>
                <p className="mb-2 text-xs text-muted">{g.help}</p>
                <table className="tbl mb-3">
                  <thead>
                    <tr>
                      {g.scopes && <th>Kapsam</th>}
                      <th className="text-right">{g.valueLabel}</th>
                      <th>Başlangıç</th>
                      <th>Bitiş</th>
                      <th>Açıklama</th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.map((r) => {
                      const live = r.valid_from <= today && (!r.valid_to || r.valid_to >= today);
                      return (
                        <tr key={r.id} className={live ? "" : "text-muted"}>
                          {g.scopes && <td>{r.scope === "*" ? "* (varsayılan)" : r.scope}</td>}
                          <td className="num text-right">{r.value.toLocaleString("tr-TR", { maximumFractionDigits: 4 })}</td>
                          <td className="whitespace-nowrap">{trDate(r.valid_from)}</td>
                          <td className="whitespace-nowrap">{r.valid_to ? trDate(r.valid_to) : "sürüyor"}</td>
                          <td className="text-xs">{r.note}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                <form action={addRuleAction} className="flex flex-wrap items-end gap-2">
                  <input type="hidden" name="type" value={g.type} />
                  <input type="hidden" name="unit" value={g.unit} />
                  {g.scopes && (
                    <label>
                      <Label>Kapsam</Label>
                      <input name="scope" className="field !w-56" list={`scopes-${g.type}`} placeholder={g.type === "komisyon" ? "ör. paytr ya da iyzico" : "ör. bileklik,kolye"} />
                      <datalist id={`scopes-${g.type}`}>
                        {[...new Set(list.map((r) => r.scope ?? ""))].map((s) => (
                          <option key={s} value={s} />
                        ))}
                      </datalist>
                    </label>
                  )}
                  <label>
                    <Label>{g.valueLabel}</Label>
                    <input name="value" required inputMode="decimal" className="field num !w-32" />
                  </label>
                  <label>
                    <Label>Geçerlilik başlangıcı</Label>
                    <input name="validFrom" type="date" required defaultValue={today} className="field" />
                  </label>
                  <label className="min-w-48 flex-1">
                    <Label>Açıklama</Label>
                    <input name="note" className="field" />
                  </label>
                  <button className="btn-primary">Yeni sürüm</button>
                </form>
              </div>
            );
          })}
        </div>
      </Card>

      <Card id="tum-eslestirmeler" title="Tüm eşleştirmeler" action={<span className="text-xs text-muted">{mappings.length} kayıt</span>}>
        {editing && (
          <div className="mb-4 rounded-lg border border-accent/40 p-3">
            <div className="mb-2 text-sm">
              <span className="font-medium">{editing.label ?? editing.keyValue}</span> <span className="text-muted">şu an: {editing.comps}</span>
            </div>
            <MappingForm keyType={editing.keyType} keyValue={editing.keyValue} label={editing.label ?? editing.keyValue} models={models} />
          </div>
        )}
        <details open={!!editing}>
          <summary className="btn cursor-pointer list-none">Listeyi göster</summary>
          <p className="mt-3 text-xs text-muted">Sıra: varyant → ürün → SKU → ürün adı. “Otomatik” kayıtlar, ad eşleşmesinden sonra Shopify varyantına kalıcı bağlanmış olanlardır.</p>
          <div className="mt-2 overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Shopify ürünü</th>
                  <th>Anahtar</th>
                  <th>Kaynak</th>
                  <th>Model(ler)</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {mappings.map((mp) => (
                  <tr key={mp.id}>
                    <td>{mp.label ?? mp.keyValue}</td>
                    <td className="text-xs text-muted">{mp.keyType}</td>
                    <td className="text-xs">{mp.source === "seed" ? "hazır liste" : mp.source === "otomatik" ? "otomatik" : "elle"}</td>
                    <td>{mp.comps}</td>
                    <td>
                      <Link href={`/maliyetler?esle=${mp.id}#tum-eslestirmeler`} className="btn !py-1 text-xs">
                        Değiştir
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </Card>
    </div>
  );
}

function NewModelForm() {
  return (
    <form action={createModelAction} className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-6">
      <label className="col-span-2">
        <Label>Model adı</Label>
        <input name="name" required className="field" placeholder="ör. Orion" />
      </label>
      <label>
        <Label>Kategori</Label>
        <select name="category" required className="field">
          {CATEGORIES.map((x) => (
            <option key={x} value={x}>
              {CAT_LABEL[x]}
            </option>
          ))}
        </select>
      </label>
      <label>
        <Label>Malzeme</Label>
        <select name="material" className="field">
          <option value="çelik">çelik</option>
          <option value="gümüş">gümüş</option>
          <option value="-">—</option>
        </select>
      </label>
      <label>
        <Label>Birim maliyet ₺</Label>
        <input name="unitCost" inputMode="decimal" className="field num" placeholder="boş = bilinmiyor" />
      </label>
      <label>
        <Label>Geçerlilik başlangıcı</Label>
        <input name="validFrom" type="date" required defaultValue="2023-01-01" className="field" />
      </label>
      <label className="col-span-2 sm:col-span-5">
        <Label>Kırılım / not</Label>
        <input name="breakdown" className="field" />
      </label>
      <div className="flex items-end">
        <button className="btn-primary w-full">Model aç</button>
      </div>
    </form>
  );
}
