// Ekranlardan gelen değişiklikler. Her değişiklikten sonra hesaplar kendiliğinden yenilenir.
import { getDb } from "./db";
import { recalcAll, rebuildDaily } from "./calc/recalc";
import { addDays } from "./time";

const c = () => getDb().$client;
const isDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);

export class InputError extends Error {}

function need(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new InputError(msg);
}

// ---------- Modeller ve maliyet sürümleri ----------

export function slugify(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c")
    .replace(/ğ/g, "g")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ş/g, "s")
    .replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function createModel(input: { name: string; category: string; material: string; unitCost: number | null; validFrom: string; breakdown?: string; note?: string }): string {
  need(input.name.trim(), "Model adı boş olamaz.");
  need(input.category, "Kategori seçilmeli.");
  need(isDate(input.validFrom), "Geçerlilik tarihi seçilmeli.");
  const mat = input.material === "gümüş" ? "gumus" : input.material === "çelik" ? "celik" : "x";
  let code = `${slugify(input.name)}-${mat}`;
  let i = 2;
  while (c().prepare("select 1 from models where code = ?").get(code)) code = `${slugify(input.name)}-${mat}-${i++}`;
  c().transaction(() => {
    c().prepare("insert into models (code, name, category, material, active) values (?, ?, ?, ?, 1)").run(code, input.name.trim(), input.category, input.material || null);
    c()
      .prepare("insert into cost_versions (model_code, unit_cost, valid_from, valid_to, breakdown, note) values (?, ?, ?, null, ?, ?)")
      .run(code, input.unitCost, input.validFrom, input.breakdown || null, input.note || null);
  })();
  recalcAll();
  return code;
}

/**
 * Yeni maliyet sürümü. Kendinden önceki sürüm otomatik kapanır; geçmişe dönük eklenirse
 * kendisi bir sonraki sürümün başlangıcından bir gün önce kapanır. Etkilenen siparişler yeniden hesaplanır.
 */
export function addCostVersion(input: { modelCode: string; unitCost: number | null; validFrom: string; breakdown?: string; note?: string }) {
  need(isDate(input.validFrom), "Geçerlilik tarihi seçilmeli.");
  need(input.unitCost === null || (Number.isFinite(input.unitCost) && input.unitCost >= 0), "Maliyet 0 ya da daha büyük bir sayı olmalı.");
  need(c().prepare("select 1 from models where code = ?").get(input.modelCode), "Model bulunamadı.");
  c().transaction(() => {
    const same = c().prepare("select id from cost_versions where model_code = ? and valid_from = ?").get(input.modelCode, input.validFrom) as { id: number } | undefined;
    if (same) {
      c().prepare("update cost_versions set unit_cost = ?, breakdown = ?, note = ? where id = ?").run(input.unitCost, input.breakdown || null, input.note || null, same.id);
      return;
    }
    const next = c()
      .prepare("select valid_from from cost_versions where model_code = ? and valid_from > ? order by valid_from limit 1")
      .get(input.modelCode, input.validFrom) as { valid_from: string } | undefined;
    c()
      .prepare("update cost_versions set valid_to = ? where model_code = ? and valid_from < ? and (valid_to is null or valid_to >= ?)")
      .run(addDays(input.validFrom, -1), input.modelCode, input.validFrom, input.validFrom);
    c()
      .prepare("insert into cost_versions (model_code, unit_cost, valid_from, valid_to, breakdown, note) values (?, ?, ?, ?, ?, ?)")
      .run(input.modelCode, input.unitCost, input.validFrom, next ? addDays(next.valid_from, -1) : null, input.breakdown || null, input.note || null);
  })();
  recalcAll();
}

export function deleteCostVersion(id: number) {
  const v = c().prepare("select model_code, valid_from, valid_to from cost_versions where id = ?").get(id) as { model_code: string; valid_from: string; valid_to: string | null } | undefined;
  need(v, "Sürüm bulunamadı.");
  const n = (c().prepare("select count(*) n from cost_versions where model_code = ?").get(v.model_code) as { n: number }).n;
  need(n > 1, "Modelin tek maliyet sürümü silinemez; yeni sürüm ekleyerek değiştirin.");
  c().transaction(() => {
    c().prepare("delete from cost_versions where id = ?").run(id);
    // Önceki sürüm boşluğu kapatacak şekilde uzar
    c()
      .prepare("update cost_versions set valid_to = ? where model_code = ? and valid_to = ?")
      .run(v.valid_to, v.model_code, addDays(v.valid_from, -1));
  })();
  recalcAll();
}

export function updateModel(code: string, input: { name: string; category: string; material: string; active: boolean }) {
  need(input.name.trim(), "Model adı boş olamaz.");
  c().prepare("update models set name = ?, category = ?, material = ?, active = ? where code = ?").run(input.name.trim(), input.category, input.material || null, input.active ? 1 : 0, code);
  recalcAll();
}

// ---------- Kurallar ----------

export function addRuleVersion(input: { type: string; unit: string; scope: string | null; value: number; validFrom: string; note?: string }) {
  need(isDate(input.validFrom), "Geçerlilik tarihi seçilmeli.");
  need(Number.isFinite(input.value) && input.value >= 0, "Değer 0 ya da daha büyük bir sayı olmalı.");
  const scope = input.scope?.trim() || null;
  c().transaction(() => {
    const cond = "type = ? and unit = ? and coalesce(scope, '') = coalesce(?, '')";
    const same = c().prepare(`select id from rules where ${cond} and valid_from = ?`).get(input.type, input.unit, scope, input.validFrom) as { id: number } | undefined;
    if (same) {
      c().prepare("update rules set value = ?, note = coalesce(?, note) where id = ?").run(input.value, input.note || null, same.id);
      return;
    }
    const next = c().prepare(`select valid_from from rules where ${cond} and valid_from > ? order by valid_from limit 1`).get(input.type, input.unit, scope, input.validFrom) as
      | { valid_from: string }
      | undefined;
    c()
      .prepare(`update rules set valid_to = ? where ${cond} and valid_from < ? and (valid_to is null or valid_to >= ?)`)
      .run(addDays(input.validFrom, -1), input.type, input.unit, scope, input.validFrom, input.validFrom);
    c()
      .prepare("insert into rules (type, unit, value, scope, note, valid_from, valid_to) values (?, ?, ?, ?, ?, ?, ?)")
      .run(input.type, input.unit, input.value, scope, input.note || null, input.validFrom, next ? addDays(next.valid_from, -1) : null);
  })();
  recalcAll();
}

// ---------- Eşleştirme ----------

export function setMapping(input: { keyType: "variant_id" | "product_id" | "sku" | "title"; keyValue: string; label?: string; components: { model: string; qty: number }[] }) {
  need(input.keyValue, "Eşleştirme anahtarı eksik.");
  need(input.components.length > 0, "En az bir model seçilmeli.");
  for (const comp of input.components) {
    need(c().prepare("select 1 from models where code = ?").get(comp.model), `Model bulunamadı: ${comp.model}`);
    need(Number.isInteger(comp.qty) && comp.qty > 0, "Adet 1 ya da daha büyük bir tam sayı olmalı.");
  }
  c().transaction(() => {
    const old = c().prepare("select id from product_map where key_type = ? and key_value = ?").get(input.keyType, input.keyValue) as { id: number } | undefined;
    if (old) {
      c().prepare("delete from product_map_components where map_id = ?").run(old.id);
      c().prepare("delete from product_map where id = ?").run(old.id);
    }
    const row = c()
      .prepare("insert into product_map (key_type, key_value, label, source, note, created_at) values (?, ?, ?, 'kullanici', null, ?) returning id")
      .get(input.keyType, input.keyValue, input.label ?? null, new Date().toISOString()) as { id: number };
    for (const comp of input.components) c().prepare("insert into product_map_components (map_id, model_code, qty) values (?, ?, ?)").run(row.id, comp.model, comp.qty);
  })();
  recalcAll();
}

// ---------- Sabit giderler ----------

export interface FixedCostForm {
  section: string;
  name: string;
  category: string;
  amount: number;
  currency: string;
  frequency: string;
  spreadMonths: number | null;
  startDate: string;
  endDate: string | null;
  note: string;
}

function checkFixed(f: FixedCostForm) {
  need(["sirket", "kisisel"].includes(f.section), "Bölüm seçilmeli.");
  need(f.name.trim(), "Kalem adı boş olamaz.");
  need(Number.isFinite(f.amount) && f.amount >= 0, "Tutar 0 ya da daha büyük bir sayı olmalı.");
  need(["TRY", "USD", "EUR"].includes(f.currency), "Para birimi TRY, USD ya da EUR olmalı.");
  need(["aylik", "yillik", "haftalik", "tek"].includes(f.frequency), "Sıklık seçilmeli.");
  need(isDate(f.startDate), "Başlangıç tarihi seçilmeli.");
  need(!f.endDate || (isDate(f.endDate) && f.endDate >= f.startDate), "Bitiş tarihi başlangıçtan önce olamaz.");
}

export function saveFixedCost(id: number | null, f: FixedCostForm) {
  checkFixed(f);
  const vals = [f.section, f.name.trim(), f.category || null, f.amount, f.currency, f.frequency, f.frequency === "tek" ? f.spreadMonths || 1 : null, f.startDate, f.endDate || null, f.note || null];
  if (id)
    c()
      .prepare("update fixed_costs set section=?, name=?, category=?, amount=?, currency=?, frequency=?, spread_months=?, start_date=?, end_date=?, note=? where id = ?")
      .run(...vals, id);
  else
    c()
      .prepare("insert into fixed_costs (section, name, category, amount, currency, frequency, spread_months, start_date, end_date, note) values (?,?,?,?,?,?,?,?,?,?)")
      .run(...vals);
  rebuildDaily();
}

export function closeFixedCost(id: number, endDate: string) {
  need(isDate(endDate), "Bitiş tarihi seçilmeli.");
  c().prepare("update fixed_costs set end_date = ? where id = ?").run(endDate, id);
  rebuildDaily();
}

export function deleteFixedCost(id: number) {
  c().prepare("delete from fixed_costs where id = ?").run(id);
  rebuildDaily();
}

// ---------- UGC / hediye gönderimleri ----------

export function saveShipment(id: number | null, s: { date: string; modelCode: string; qty: number; personNote: string; withShipping: boolean }) {
  need(isDate(s.date), "Tarih seçilmeli.");
  need(c().prepare("select 1 from models where code = ?").get(s.modelCode), "Model seçilmeli.");
  need(Number.isInteger(s.qty) && s.qty > 0, "Adet 1 ya da daha büyük olmalı.");
  const vals = [s.date, s.modelCode, s.qty, s.personNote || null, s.withShipping ? 1 : 0];
  if (id) c().prepare("update marketing_shipments set date=?, model_code=?, qty=?, person_note=?, with_shipping=? where id = ?").run(...vals, id);
  else c().prepare("insert into marketing_shipments (date, model_code, qty, person_note, with_shipping) values (?,?,?,?,?)").run(...vals);
  rebuildDaily();
}

export function deleteShipment(id: number) {
  c().prepare("delete from marketing_shipments where id = ?").run(id);
  rebuildDaily();
}

// ---------- Olay günlüğü (Faz 2'de ekranı gelecek) ----------

export function addEvent(e: { date: string; type: string; title: string; detail?: string; modelCode?: string; productId?: string; variantId?: string; source: "otomatik" | "manuel" }) {
  c()
    .prepare("insert into events (date, type, title, detail, model_code, product_id, variant_id, source, created_at) values (?,?,?,?,?,?,?,?,?)")
    .run(e.date, e.type, e.title, e.detail ?? null, e.modelCode ?? null, e.productId ?? null, e.variantId ?? null, e.source, new Date().toISOString());
}
