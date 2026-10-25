import { openDb, setDbForTests, type DB } from "@/lib/db";
import { COSTS, MAP, MODELS, RULES } from "./helpers";

export function freshDb(withFixtures = true): DB {
  const db = openDb(":memory:");
  setDbForTests(db);
  if (withFixtures) {
    const c = db.$client;
    for (const m of MODELS) c.prepare("insert into models (code, name, category, material) values (?,?,?,?)").run(m.code, m.name, m.category, m.material);
    for (const x of COSTS) c.prepare("insert into cost_versions (model_code, unit_cost, valid_from, valid_to) values (?,?,?,?)").run(x.modelCode, x.unitCost, x.validFrom, x.validTo);
    for (const r of RULES) c.prepare("insert into rules (type, unit, value, scope, valid_from, valid_to) values (?,?,?,?,?,?)").run(r.type, r.unit, r.value, r.scope, r.validFrom, r.validTo);
    for (const e of MAP) {
      const row = c.prepare("insert into product_map (key_type, key_value, label, source, created_at) values (?,?,?, 'seed', ?) returning id").get(e.keyType, e.keyValue, e.keyValue, new Date().toISOString()) as { id: number };
      for (const comp of e.components) c.prepare("insert into product_map_components (map_id, model_code, qty) values (?,?,?)").run(row.id, comp.model, comp.qty);
    }
  }
  return db;
}

let seq = 0;
export function insertOrder(
  db: DB,
  o: { createdAt: string; total: number; lines: { title: string; price: number; qty?: number; disc?: number; variantId?: string; id?: string }[]; gateway?: string; customerId?: string; test?: boolean; cancelledAt?: string; fulfilled?: boolean },
): string {
  const id = `gid://shopify/Order/${++seq}`;
  const c = db.$client;
  c.prepare(
    `insert into orders (id, store_id, name, created_at, updated_at, cancelled_at, test, total_price, shipping_charged, gateways, customer_id, fulfillment_count, raw_json)
     values (?, 1, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, '{}')`,
  ).run(id, `#${seq}`, o.createdAt, o.createdAt, o.cancelledAt ?? null, o.test ? 1 : 0, o.total, JSON.stringify([o.gateway ?? "PayTR"]), o.customerId ?? null, o.fulfilled === false ? 0 : 1);
  o.lines.forEach((l, i) => {
    c.prepare(
      `insert into order_lines (id, order_id, title, name, quantity, original_unit_price, discounted_total, discount_allocated, variant_id, raw_json)
       values (?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')`,
    ).run(l.id ?? `${id}/L${i}`, id, l.title, l.title, l.qty ?? 1, l.price, l.price * (l.qty ?? 1) - (l.disc ?? 0), l.disc ?? 0, l.variantId ?? null);
  });
  return id;
}

export function insertRefund(db: DB, orderId: string, r: { id: string; createdAt: string; amount: number; lines: { lineItemId: string; qty: number; restockType: string; subtotal: number }[] }) {
  const c = db.$client;
  c.prepare("insert into refunds (id, order_id, created_at, total_refunded, lines_loaded, raw_json) values (?,?,?,?,1,'{}')").run(r.id, orderId, r.createdAt, r.amount);
  r.lines.forEach((l, i) =>
    c.prepare("insert into refund_lines (id, refund_id, order_id, line_item_id, quantity, restock_type, subtotal, raw_json) values (?,?,?,?,?,?,?,'{}')").run(`${r.id}/${i}`, r.id, orderId, l.lineItemId, l.qty, l.restockType, l.subtotal),
  );
}
