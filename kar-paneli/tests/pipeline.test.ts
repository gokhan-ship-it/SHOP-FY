import { beforeEach, describe, expect, it } from "vitest";
import { recalcAll } from "@/lib/calc/recalc";
import { addCostVersion, saveFixedCost, setMapping, saveShipment } from "@/lib/services";
import { totals } from "@/lib/metrics";
import { freshDb, insertOrder, insertRefund } from "./db";
import type { DB } from "@/lib/db";

let db: DB;
const day = (d: string) => db.$client.prepare("select * from daily_pnl where date = ?").get(d) as Record<string, number>;

beforeEach(() => {
  db = freshDb();
});

describe("kâr tablosu", () => {
  it("iade, kâr tablosunda iadenin yapıldığı güne yazılır; stoğa dönen maliyet o gün geri alınır", () => {
    const oid = insertOrder(db, {
      createdAt: "2026-03-10T09:00:00Z",
      total: 2848.5,
      lines: [
        { id: "L1", title: "Luna - 316L Çelik", price: 2299, disc: 750 },
        { id: "L2", title: "Chloe - 316L Cerrahi Çelik", price: 2099, disc: 799.5 },
      ],
    });
    insertRefund(db, oid, { id: "R1", createdAt: "2026-03-20T09:00:00Z", amount: 1400, lines: [{ lineItemId: "L1", qty: 1, restockType: "RETURN", subtotal: 1400 }] });
    recalcAll(db);
    const d10 = day("2026-03-10");
    const d20 = day("2026-03-20");
    expect(d10.revenue).toBe(2848.5);
    expect(d10.refunds).toBe(0);
    expect(d10.cogs).toBe(200);
    expect(d10.shipping_cost).toBe(60);
    expect(d10.orders).toBe(1);
    expect(d10.couple_orders).toBe(1);
    expect(d20.refunds).toBe(1400);
    expect(d20.net_revenue).toBe(-1400);
    expect(d20.cogs).toBe(-100);
    // şelale tutarlılığı
    for (const d of [d10, d20]) {
      expect(d.pre_ad_profit).toBeCloseTo(d.net_revenue - d.cogs - d.shipping_cost - d.commission - d.kdv, 6);
      expect(d.post_ad_profit).toBeCloseTo(d.pre_ad_profit - d.meta_spend - d.other_marketing, 6);
      expect(d.take_home).toBeCloseTo(d.company_net - d.fixed_personal, 6);
    }
  });

  it("sabit giderler şirket/kişisel olarak günlere dağılır", () => {
    insertOrder(db, { createdAt: "2026-02-01T09:00:00Z", total: 1000, lines: [{ title: "Luna - 316L Çelik", price: 1000 }] });
    saveFixedCost(null, { section: "sirket", name: "Personel", category: "Personel", amount: 28000, currency: "TRY", frequency: "aylik", spreadMonths: null, startDate: "2026-02-01", endDate: null, note: "" });
    saveFixedCost(null, { section: "kisisel", name: "Kira", category: "Kira", amount: 31000, currency: "TRY", frequency: "aylik", spreadMonths: null, startDate: "2026-03-01", endDate: null, note: "" });
    expect(day("2026-02-14").fixed_company).toBe(1000);
    expect(day("2026-02-14").fixed_personal).toBe(0);
    expect(day("2026-03-03").fixed_company).toBeCloseTo(903.2258, 3);
    expect(day("2026-03-03").fixed_personal).toBe(1000);
    const t = totals("2026-02-01", "2026-02-28");
    expect(t.fixed_company).toBeCloseTo(28000, 6);
  });

  it("UGC gönderimi diğer pazarlamaya model maliyeti + kargo olarak yazılır", () => {
    insertOrder(db, { createdAt: "2026-04-01T09:00:00Z", total: 1000, lines: [{ title: "Luna - 316L Çelik", price: 1000 }] });
    recalcAll(db);
    saveShipment(null, { date: "2026-04-02", modelCode: "aurora-celik", qty: 2, personNote: "UGC", withShipping: true });
    expect(day("2026-04-02").other_marketing).toBe(250 * 2 + 60);
  });
});

describe("maliyet sürümleri", () => {
  it("yeni sürüm öncekini kapatır; geçmişe dönük eklenince siparişler kendiliğinden yeniden hesaplanır", () => {
    insertOrder(db, { createdAt: "2026-05-01T09:00:00Z", total: 1898, lines: [{ title: "Luna - 316L Çelik", price: 2299 }] });
    insertOrder(db, { createdAt: "2026-06-01T09:00:00Z", total: 1898, lines: [{ title: "Luna - 316L Çelik", price: 2299 }] });
    recalcAll(db);
    expect(day("2026-05-01").cogs).toBe(100);
    addCostVersion({ modelCode: "luna-celik", unitCost: 210, validFrom: "2026-05-15" });
    const vs = db.$client.prepare("select unit_cost, valid_from, valid_to from cost_versions where model_code = 'luna-celik' order by valid_from").all();
    expect(vs).toEqual([
      { unit_cost: 100, valid_from: "2023-01-01", valid_to: "2026-05-14" },
      { unit_cost: 210, valid_from: "2026-05-15", valid_to: null },
    ]);
    expect(day("2026-05-01").cogs).toBe(100);
    expect(day("2026-06-01").cogs).toBe(210);
    // araya geçmişe dönük sürüm
    addCostVersion({ modelCode: "luna-celik", unitCost: 150, validFrom: "2026-04-01" });
    const vs2 = db.$client.prepare("select unit_cost, valid_from, valid_to from cost_versions where model_code = 'luna-celik' order by valid_from").all();
    expect(vs2).toEqual([
      { unit_cost: 100, valid_from: "2023-01-01", valid_to: "2026-03-31" },
      { unit_cost: 150, valid_from: "2026-04-01", valid_to: "2026-05-14" },
      { unit_cost: 210, valid_from: "2026-05-15", valid_to: null },
    ]);
    expect(day("2026-05-01").cogs).toBe(150);
  });
});

describe("eşleştirme", () => {
  it("ad ile eşleşen ürünün variant_id'si bağlanır; ad değişse de eşleşme korunur", () => {
    insertOrder(db, { createdAt: "2026-07-01T09:00:00Z", total: 1898, lines: [{ title: "Luna - 316L Çelik", price: 2299, variantId: "gid://shopify/ProductVariant/77" }] });
    recalcAll(db);
    const bound = db.$client.prepare("select source from product_map where key_type = 'variant_id' and key_value = ?").get("gid://shopify/ProductVariant/77") as { source: string };
    expect(bound.source).toBe("otomatik");
    insertOrder(db, { createdAt: "2026-07-20T09:00:00Z", total: 1898, lines: [{ title: "Luna Zaman Kapsülü - Yeni Ad", price: 2299, variantId: "gid://shopify/ProductVariant/77" }] });
    recalcAll(db);
    expect(day("2026-07-20").cogs).toBe(100);
    expect((db.$client.prepare("select sum(unmatched_lines) n from order_calc").get() as { n: number }).n).toBe(0);
  });

  it("eşleşmeyen ürün kutuya düşer; eşleştirme geçmiş siparişlere de uygulanır", () => {
    insertOrder(db, { createdAt: "2026-08-01T09:00:00Z", total: 2500, lines: [{ title: "Orion Bileklik", price: 2500, variantId: "V-ORION" }] });
    recalcAll(db);
    expect(day("2026-08-01").cogs).toBe(0);
    expect((db.$client.prepare("select sum(unmatched_lines) n from order_calc").get() as { n: number }).n).toBe(1);
    setMapping({ keyType: "variant_id", keyValue: "V-ORION", label: "Orion Bileklik", components: [{ model: "astor-celik", qty: 1 }] });
    expect(day("2026-08-01").cogs).toBe(100);
  });
});

describe("yeni müşteri", () => {
  it("müşterinin ilk siparişi yeni müşteri sayılır, ikincisi sayılmaz; test siparişi sırayı bozmaz", () => {
    insertOrder(db, { createdAt: "2026-09-01T09:00:00Z", total: 100, test: true, customerId: "C1", lines: [{ title: "Luna - 316L Çelik", price: 100 }] });
    insertOrder(db, { createdAt: "2026-09-02T09:00:00Z", total: 100, customerId: "C1", lines: [{ title: "Luna - 316L Çelik", price: 100 }] });
    insertOrder(db, { createdAt: "2026-09-03T09:00:00Z", total: 100, customerId: "C1", lines: [{ title: "Luna - 316L Çelik", price: 100 }] });
    recalcAll(db);
    expect(day("2026-09-02").new_customer_orders).toBe(1);
    expect(day("2026-09-03").new_customer_orders).toBe(0);
    expect(day("2026-09-01")).toBeUndefined(); // test siparişi hiç yazılmaz
  });
});
