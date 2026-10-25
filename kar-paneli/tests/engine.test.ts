import { describe, expect, it } from "vitest";
import { computeOrder } from "@/lib/calc/engine";
import { fixedCostShareForDay, fixedCostTlForDay } from "@/lib/calc/fixed";
import { COSTS, ctx, order } from "./helpers";

describe("§9.2 couple set", () => {
  it("tek üründe 2 bileklik: maliyet 2 × bileklik, kargo tek, kapsül 2", () => {
    const r = computeOrder(order({ totalPrice: 2898, lines: [{ title: "Astor + Chloe Couple Zaman Kapsülü", originalUnitPrice: 2898 }] }), ctx());
    expect(r.order.cogs).toBe(200);
    expect(r.order.shippingCost).toBe(60);
    expect(r.order.capsules).toBe(2);
    expect(r.order.couple).toBe(true);
    // ürün ekranında set iki modele bölünür
    expect(r.lines.map((l) => l.modelCode).sort()).toEqual(["astor-celik", "chloe-celik"]);
    expect(r.lines.reduce((s, l) => s + l.revenue, 0)).toBeCloseTo(2898, 2);
  });
});

describe("§9.2 couple sipariş", () => {
  it("2 ayrı ürün (Luna + Chloe): kapsül 2, couple sayılır, tek kargo", () => {
    const r = computeOrder(
      order({
        totalPrice: 2848.5,
        lines: [
          { title: "Luna - 316L Çelik", originalUnitPrice: 2299, discountAllocated: 799.5 },
          { title: "Chloe - 316L Cerrahi Çelik", originalUnitPrice: 2099, discountAllocated: 750 },
        ],
      }),
      ctx(),
    );
    expect(r.order.capsules).toBe(2);
    expect(r.order.couple).toBe(true);
    expect(r.order.shippingCost).toBe(60);
    expect(r.order.cogs).toBe(200);
    expect(r.order.dtc).toBe(true);
  });

  it("tek kapsüllü sipariş couple değildir; klasik kapsül sayılmaz", () => {
    const r = computeOrder(
      order({ totalPrice: 3998, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 2299 }, { title: "Klasik Zaman Kapsülü", originalUnitPrice: 1999 }] }),
      ctx(),
    );
    expect(r.order.capsules).toBe(1);
    expect(r.order.couple).toBe(false);
  });
});

describe("§9.2 iade", () => {
  const base = () =>
    order({
      createdAt: "2026-03-10T10:00:00Z",
      totalPrice: 2848.5,
      lines: [
        { id: "L1", title: "Luna - 316L Çelik", originalUnitPrice: 2299 },
        { id: "L2", title: "Chloe - 316L Cerrahi Çelik", originalUnitPrice: 2099 },
      ],
    });

  it("iade gününe düşer; stoğa dönen ürünün maliyeti geri alınır", () => {
    const o = base();
    o.refunds = [{ id: "R1", createdAt: "2026-03-20T09:00:00Z", totalRefunded: 1400, lines: [{ lineItemId: "L1", quantity: 1, restockType: "RETURN", subtotal: 1400 }] }];
    const r = computeOrder(o, ctx());
    expect(r.order.date).toBe("2026-03-10");
    expect(r.refunds).toHaveLength(1);
    expect(r.refunds[0].date).toBe("2026-03-20");
    expect(r.refunds[0].amount).toBe(1400);
    expect(r.refunds[0].cogsBack).toBe(100);
    expect(r.refunds[0].kdvBack).toBeCloseTo((1400 * r.order.kdv) / r.order.revenue, 2);
    expect(r.refunds[0].commissionBack).toBe(0); // komisyon geri gelmez (ayar)
    // ürün ekranında iade siparişin tarihine bağlanır
    const luna = r.lines.find((l) => l.modelCode === "luna-celik")!;
    expect(luna.date).toBe("2026-03-10");
    expect(luna.refundedUnits).toBe(1);
    expect(luna.refundAmount).toBe(1400);
  });

  it("stoğa dönmeyen ürünün maliyeti geri alınmaz", () => {
    const o = base();
    o.refunds = [{ id: "R2", createdAt: "2026-03-21T09:00:00Z", totalRefunded: 500, lines: [{ lineItemId: "L2", quantity: 1, restockType: "NO_RESTOCK", subtotal: 500 }] }];
    expect(computeOrder(o, ctx()).refunds[0].cogsBack).toBe(0);
  });

  it("iptal ile stoğa dönen de maliyet geri alır", () => {
    const o = base();
    o.refunds = [{ id: "R3", createdAt: "2026-03-11T09:00:00Z", totalRefunded: 2848.5, lines: [{ lineItemId: "L1", quantity: 1, restockType: "CANCEL", subtotal: 1400 }, { lineItemId: "L2", quantity: 1, restockType: "CANCEL", subtotal: 1448.5 }] }];
    expect(computeOrder(o, ctx()).refunds[0].cogsBack).toBe(200);
  });
});

describe("§9.2 sabit gider", () => {
  const fc = { section: "sirket", amount: 28000, currency: "TRY", frequency: "aylik", startDate: "2026-01-01", endDate: null };
  it("₺28.000 aylık gider Şubat'ta günde ₺1.000", () => {
    expect(fixedCostShareForDay(fc, "2026-02-10")).toBe(1000);
  });
  it("Mart'ta günde ₺903,23", () => {
    expect(Math.round(fixedCostShareForDay(fc, "2026-03-10") * 100) / 100).toBe(903.23);
  });
  it("başlangıç–bitiş dışında yazılmaz", () => {
    expect(fixedCostShareForDay({ ...fc, startDate: "2026-03-05", endDate: "2026-03-20" }, "2026-03-04")).toBe(0);
    expect(fixedCostShareForDay({ ...fc, startDate: "2026-03-05", endDate: "2026-03-20" }, "2026-03-21")).toBe(0);
  });
  it("yıllık, haftalık, tek seferlik ve yayılmış tek seferlik", () => {
    expect(fixedCostShareForDay({ ...fc, frequency: "yillik", amount: 36500 }, "2026-05-01")).toBe(100);
    expect(fixedCostShareForDay({ ...fc, frequency: "haftalik", amount: 700 }, "2026-05-01")).toBe(100);
    expect(fixedCostShareForDay({ ...fc, frequency: "tek", amount: 5000, startDate: "2026-05-03" }, "2026-05-03")).toBe(5000);
    expect(fixedCostShareForDay({ ...fc, frequency: "tek", amount: 5000, startDate: "2026-05-03" }, "2026-05-04")).toBe(0);
    const spread = { ...fc, frequency: "tek", amount: 6000, spreadMonths: 3, startDate: "2026-02-10" };
    expect(fixedCostShareForDay(spread, "2026-02-01")).toBeCloseTo(2000 / 28, 6);
    expect(fixedCostShareForDay(spread, "2026-04-30")).toBeCloseTo(2000 / 30, 6);
    expect(fixedCostShareForDay(spread, "2026-05-01")).toBe(0);
  });
  it("USD gider o günün kuruyla TL'ye çevrilir", () => {
    const usd = { ...fc, currency: "USD", amount: 2800 };
    expect(fixedCostTlForDay(usd, "2026-02-10", () => 40)).toBe(4000);
    expect(fixedCostTlForDay(usd, "2026-02-10", () => null)).toBeNull();
  });
});

describe("§9.2 tarihli maliyet", () => {
  const costs = [
    ...COSTS.filter((c) => c.modelCode !== "luna-celik"),
    { modelCode: "luna-celik", unitCost: 100, validFrom: "2023-01-01", validTo: "2026-03-14" },
    { modelCode: "luna-celik", unitCost: 130, validFrom: "2026-03-15", validTo: null },
  ];
  const mk = (createdAt: string) => order({ createdAt, totalPrice: 1898, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 2299 }] });
  it("değişim gününden önceki sipariş eski sürümü kullanır (İstanbul 23:59)", () => {
    const r = computeOrder(mk("2026-03-14T20:59:00Z"), ctx({ costs }));
    expect(r.order.date).toBe("2026-03-14");
    expect(r.order.cogs).toBe(100);
  });
  it("değişim günündeki sipariş yeni sürümü kullanır (İstanbul 00:00)", () => {
    const r = computeOrder(mk("2026-03-14T21:00:00Z"), ctx({ costs }));
    expect(r.order.date).toBe("2026-03-15");
    expect(r.order.cogs).toBe(130);
  });
});

describe("§9.2 ödeme yöntemi", () => {
  const mk = (g: string) => order({ totalPrice: 1000, gateways: [g], lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 1000 }] });
  it('"Paytr" ve "PayTR" aynı orana gider', () => {
    const a = computeOrder(mk("Paytr"), ctx()).order;
    const b = computeOrder(mk("PayTR"), ctx()).order;
    expect(a.commissionRate).toBeCloseTo(0.05, 6);
    expect(b.commissionRate).toBe(a.commissionRate);
    expect(a.gatewayKnown && b.gatewayKnown).toBe(true);
    expect(a.commission).toBeCloseTo(50, 2);
  });
  it("bilinmeyen yöntem varsayılan orana gider ve uyarı üretir", () => {
    const r = computeOrder(mk("Iyzico"), ctx()).order;
    expect(r.commissionRate).toBeCloseTo(0.03, 6);
    expect(r.gatewayKnown).toBe(false);
  });
});

describe("filtreler ve KDV", () => {
  it("test siparişleri ve gönderilmeden iptal edilenler hariç", () => {
    expect(computeOrder(order({ test: true, totalPrice: 100, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 100 }] }), ctx()).order.included).toBe(false);
    const c = computeOrder(order({ cancelledAt: "2026-03-11T00:00:00Z", fulfillmentCount: 0, totalPrice: 100, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 100 }] }), ctx());
    expect(c.order.included).toBe(false);
    expect(c.order.excludeReason).toBe("gönderilmeden iptal");
    const shipped = computeOrder(order({ cancelledAt: "2026-03-11T00:00:00Z", fulfillmentCount: 1, totalPrice: 100, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 100 }] }), ctx());
    expect(shipped.order.included).toBe(true);
  });
  it("yalnızca event içeren ya da cirosu 0 olan sipariş DTC değildir; event kargo almaz", () => {
    const ev = computeOrder(order({ totalPrice: 500, lines: [{ title: "Event Bileti", originalUnitPrice: 500 }] }), ctx()).order;
    expect(ev.dtc).toBe(false);
    expect(ev.shippingCost).toBe(0);
    expect(ev.kdv).toBeCloseTo(500 / 6, 1);
    const free = computeOrder(order({ totalPrice: 0, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 2299, discountAllocated: 2299 }] }), ctx()).order;
    expect(free.dtc).toBe(false);
    expect(free.included).toBe(true);
  });
  it("KDV: takı %0,8333, klasik 1/6; sipariş cirosu satırların indirimli tutarına oranla dağıtılır", () => {
    const r = computeOrder(
      order({ totalPrice: 3000, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 2000 }, { title: "Klasik Zaman Kapsülü", originalUnitPrice: 1000 }] }),
      ctx(),
    ).order;
    expect(r.kdv).toBeCloseTo(2000 * 0.008333 + 1000 * 0.166667, 1);
  });
  it("eşleşmeyen ürün sayılır ve fiziksel kabul edilir", () => {
    const r = computeOrder(order({ totalPrice: 1000, lines: [{ title: "Yepyeni Ürün", originalUnitPrice: 1000 }] }), ctx()).order;
    expect(r.unmatchedLines).toBe(1);
    expect(r.physical).toBe(true);
    expect(r.shippingCost).toBe(60);
  });
  it("eşleştirme sırası: variant_id ürün adından önce gelir", () => {
    const c = ctx();
    c.addMapping({ keyType: "variant_id", keyValue: "V9", components: [{ model: "aurora-celik", qty: 1 }] });
    const r = computeOrder(order({ totalPrice: 1000, lines: [{ title: "Luna - 316L Çelik", variantId: "V9", originalUnitPrice: 1000 }] }), c);
    expect(r.matches[0].matchedBy).toBe("variant_id");
    expect(r.order.cogs).toBe(250);
  });
});

describe("seed bileşen ayrıştırma", () => {
  it("model kodu x ile bitse de doğru ayrılır", async () => {
    const { parseComponents } = await import("@/lib/seed");
    expect(parseComponents("klasik-zaman-kapsulu-x×1")).toEqual([{ model: "klasik-zaman-kapsulu-x", qty: 1 }]);
    expect(parseComponents("astor-celik×1 + chloe-celik×2")).toEqual([{ model: "astor-celik", qty: 1 }, { model: "chloe-celik", qty: 2 }]);
    expect(parseComponents("premium-hediye-kutusu-x")).toEqual([{ model: "premium-hediye-kutusu-x", qty: 1 }]);
  });
});
