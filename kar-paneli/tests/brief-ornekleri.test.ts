// Brief §9.2'deki örnekler, gerçek seed maliyet ve kurallarıyla. Ticari veriler herkese açık depoda
// olmadığından beklenen tutarlar seed'den okunur; seed/ klasörü yoksa test atlanır (kurulum paketinde çalışır).
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDb, setDbForTests } from "@/lib/db";
import { importSeed } from "@/lib/seed";
import { loadContext } from "@/lib/calc/recalc";
import { computeOrder } from "@/lib/calc/engine";
import { order } from "./helpers";

const has = fs.existsSync(path.join(process.cwd(), "seed", "maliyetler.csv"));

describe.skipIf(!has)("brief §9.2 — gerçek seed değerleriyle", () => {
  const db = openDb(":memory:");
  setDbForTests(db);
  importSeed(db);
  const ctx = loadContext(db);
  const d = "2026-10-22";

  it("couple set (Astor + Chloe): ürün maliyeti = iki bileklik, kargo tek", () => {
    const r = computeOrder(order({ createdAt: `${d}T10:00:00Z`, totalPrice: 2898, lines: [{ title: "Astor + Chloe Couple Zaman Kapsülü", originalUnitPrice: 2898 }] }), ctx);
    expect(r.order.cogs).toBe(ctx.unitCost("astor-celik", d)! + ctx.unitCost("chloe-celik", d)!);
    expect(r.order.shippingCost).toBe(ctx.shippingCost(d));
    expect(r.order.capsules).toBe(2);
    console.log(`  couple set: ürün maliyeti ₺${r.order.cogs}, kargo ₺${r.order.shippingCost}`);
  });

  it("couple sipariş (Luna + Chloe Gold): kapsül 2, couple, tek kargo", () => {
    const r = computeOrder(
      order({ createdAt: `${d}T10:00:00Z`, totalPrice: 2848.5, lines: [{ title: "Luna - 316L Çelik", originalUnitPrice: 2299 }, { title: "Chloe Gold - 316L Cerrahi Çelik", originalUnitPrice: 2099 }] }),
      ctx,
    );
    expect(r.order.capsules).toBe(2);
    expect(r.order.couple).toBe(true);
    expect(r.order.shippingCost).toBe(ctx.shippingCost(d));
  });

  it('"Paytr" ve "PayTR" aynı orana gider; bilinmeyen yöntem varsayılana', () => {
    const a = ctx.commissionRate("Paytr", d);
    expect(a.known).toBe(true);
    expect(ctx.commissionRate("PayTR", d)).toEqual(a);
    expect(ctx.commissionRate("Bilinmeyen", d).known).toBe(false);
  });

  it("seed'deki tüm modellerin maliyeti var", () => {
    const missing = [...ctx.models.keys()].filter((m) => ctx.unitCost(m, d) === null);
    expect(missing).toEqual([]);
  });
});
