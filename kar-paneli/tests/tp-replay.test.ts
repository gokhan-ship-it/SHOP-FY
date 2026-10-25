// TrueProfit provası: TrueProfit sipariş dökümü sahte Shopify siparişlerine çevrilir, motor çalıştırılır
// ve sonuç seed/dogrulama_referans.csv ile karşılaştırılır. Ticari veri herkese açık depoda olmadığından
// seed/ ve trueprofit/ klasörleri yoksa bu test atlanır.
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { openDb, setDbForTests } from "@/lib/db";
import { importSeed } from "@/lib/seed";
import { recalcAll } from "@/lib/calc/recalc";
import { validationReport, METRIC_LABELS, type Metric } from "@/lib/validation";

const root = process.cwd();
const has = fs.existsSync(path.join(root, "seed", "dogrulama_referans.csv")) && fs.existsSync(path.join(root, "trueprofit"));

describe.skipIf(!has)("TrueProfit provası", () => {
  it("motor, TrueProfit siparişleriyle referans aylık rakamları tolerans içinde üretir", () => {
    const db = openDb(":memory:");
    setDbForTests(db);
    importSeed(db);
    const c = db.$client;
    const tp = c.prepare("select order_code, date, items, revenue from tp_orders").all() as { order_code: string; date: string; items: string; revenue: number }[];
    const insO = c.prepare(
      `insert into orders (id, store_id, name, created_at, updated_at, test, total_price, shipping_charged, gateways, fulfillment_count, raw_json)
       values (?, 1, ?, ?, ?, 0, ?, 0, '["PayTR"]', 1, '{}')`,
    );
    const insL = c.prepare(
      `insert into order_lines (id, order_id, title, name, quantity, original_unit_price, discounted_total, discount_allocated, raw_json)
       values (?, ?, ?, ?, ?, ?, ?, 0, '{}')`,
    );
    c.transaction(() => {
      for (const o of tp) {
        const id = `tp:${o.order_code}`;
        const ts = `${o.date}T09:00:00Z`;
        insO.run(id, o.order_code, ts, ts, o.revenue);
        o.items
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean)
          .forEach((s, i) => {
            const m = /^(\d+)x(.*)\(([\d.]+)\)$/.exec(s)!;
            insL.run(`${id}/${i}`, id, m[2], m[2], Number(m[1]), Number(m[3]), Number(m[1]) * Number(m[3]));
          });
      }
      // TrueProfit aylık iadeleri: ayın 15'ine tek iade (satır bilgisi yok → maliyet geri alınmaz)
      const months = c.prepare("select month, refunds from tp_monthly where refunds > 0").all() as { month: string; refunds: number }[];
      for (const m of months) {
        const oid = (c.prepare("select id from orders where substr(created_at,1,7) = ? limit 1").get(m.month) as { id: string } | undefined)?.id;
        if (!oid) continue;
        c.prepare("insert into refunds (id, order_id, created_at, total_refunded, lines_loaded, raw_json) values (?, ?, ?, ?, 1, '{}')").run(`tp-refund:${m.month}`, oid, `${m.month}-15T09:00:00Z`, m.refunds);
      }
    })();
    recalcAll(db);
    const rep = validationReport();
    const metrics = Object.keys(METRIC_LABELS) as Metric[];
    const lines = rep.map((r) => `${r.month}  ` + metrics.map((m) => `${METRIC_LABELS[m]} ${r.values[m].diff === null ? "—" : ((r.values[m].diff! * 100).toFixed(2) + "%").padStart(7)}${r.values[m].ok ? " " : "✗"}`).join("  "));
    console.log("\nTrueProfit provası — referansa göre fark\n" + lines.join("\n"));

    for (const r of rep) {
      expect(Math.abs(r.values.orders.diff!), `${r.month} sipariş`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(r.values.netRevenue.diff!), `${r.month} net ciro`).toBeLessThanOrEqual(0.02);
      expect(Math.abs(r.values.metaSpend.diff!), `${r.month} meta`).toBeLessThanOrEqual(0.005);
    }
  });
});
