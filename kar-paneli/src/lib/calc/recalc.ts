// Hesaplanmış tabloları (order_calc, line_calc, refund_calc, daily_pnl) baştan üretir.
// Maliyet, kural, eşleştirme, gider ya da veri değişince otomatik çağrılır; elle düğme yoktur.
import { getDb, type DB } from "../db";
import { CalcContext, type CostVersion, type MapEntry, type ModelInfo, type Rule } from "./context";
import { computeOrder, type OrderIn, type OrderResult } from "./engine";
import { fixedTotalsForDay, type FixedCostIn } from "./fixed";
import { loadFxLookup } from "../fx";
import { eachDay, todayIst, monthEnd, monthStart, minDate } from "../time";
import { setJsonSetting } from "../settings";

export function loadContext(db: DB = getDb()): CalcContext {
  const c = db.$client;
  const models = c.prepare("select code, name, category, material from models").all() as ModelInfo[];
  const costs = c.prepare("select model_code modelCode, unit_cost unitCost, valid_from validFrom, valid_to validTo from cost_versions").all() as CostVersion[];
  const rules = c.prepare("select type, unit, value, scope, valid_from validFrom, valid_to validTo from rules").all() as Rule[];
  const maps = c.prepare("select id, key_type keyType, key_value keyValue from product_map").all() as { id: number; keyType: MapEntry["keyType"]; keyValue: string }[];
  const comps = c.prepare("select map_id mapId, model_code model, qty from product_map_components").all() as { mapId: number; model: string; qty: number }[];
  const byMap = new Map<number, { model: string; qty: number }[]>();
  for (const x of comps) {
    const a = byMap.get(x.mapId) ?? [];
    a.push({ model: x.model, qty: x.qty });
    byMap.set(x.mapId, a);
  }
  const map: MapEntry[] = maps.filter((m) => byMap.has(m.id)).map((m) => ({ keyType: m.keyType, keyValue: m.keyValue, components: byMap.get(m.id)! }));
  return new CalcContext({ models, costs, rules, map });
}

export function loadOrders(db: DB = getDb()): OrderIn[] {
  const c = db.$client;
  const orders = c
    .prepare(
      `select id, name, created_at createdAt, cancelled_at cancelledAt, test, total_price totalPrice,
              coalesce(shipping_charged, total_shipping, 0) shippingCharged, gateways, customer_id customerId,
              fulfillment_count fulfillmentCount
         from orders order by created_at`,
    )
    .all() as (Omit<OrderIn, "gateways" | "lines" | "refunds" | "test"> & { gateways: string | null; test: number })[];
  const lines = c
    .prepare(
      `select id, order_id orderId, title, variant_title variantTitle, name, sku, quantity,
              original_unit_price originalUnitPrice, discount_allocated discountAllocated,
              product_id productId, variant_id variantId from order_lines`,
    )
    .all() as (OrderIn["lines"][number] & { orderId: string })[];
  const refunds = c
    .prepare("select id, order_id orderId, created_at createdAt, total_refunded totalRefunded from refunds")
    .all() as { id: string; orderId: string; createdAt: string; totalRefunded: number }[];
  const rlines = c
    .prepare("select refund_id refundId, line_item_id lineItemId, quantity, restock_type restockType, subtotal from refund_lines")
    .all() as { refundId: string; lineItemId: string; quantity: number; restockType: string | null; subtotal: number }[];

  const linesBy = new Map<string, OrderIn["lines"]>();
  for (const l of lines) {
    const a = linesBy.get(l.orderId) ?? [];
    a.push(l);
    linesBy.set(l.orderId, a);
  }
  const rlBy = new Map<string, OrderIn["refunds"][number]["lines"]>();
  for (const r of rlines) {
    const a = rlBy.get(r.refundId) ?? [];
    a.push(r);
    rlBy.set(r.refundId, a);
  }
  const refBy = new Map<string, OrderIn["refunds"]>();
  for (const r of refunds) {
    const a = refBy.get(r.orderId) ?? [];
    a.push({ id: r.id, createdAt: r.createdAt, totalRefunded: r.totalRefunded, lines: rlBy.get(r.id) ?? [] });
    refBy.set(r.orderId, a);
  }

  // Müşterinin kaçıncı siparişi: test olmayan siparişler içinde oluşturulma sırasına göre
  const seen = new Map<string, number>();
  return orders.map((o) => {
    let idx: number | null = null;
    if (o.customerId && !o.test) {
      idx = (seen.get(o.customerId) ?? 0) + 1;
      seen.set(o.customerId, idx);
    }
    let gateways: string[] = [];
    try {
      gateways = o.gateways ? JSON.parse(o.gateways) : [];
    } catch {
      gateways = [];
    }
    return {
      ...o,
      test: !!o.test,
      gateways,
      customerOrderIndex: idx,
      lines: linesBy.get(o.id) ?? [],
      refunds: refBy.get(o.id) ?? [],
    };
  });
}

export interface RecalcSummary {
  at: string;
  ms: number;
  orders: number;
  included: number;
  days: number;
  autoBound: number;
}

export function recalcAll(db: DB = getDb()): RecalcSummary {
  const t0 = Date.now();
  const ctx = loadContext(db);
  const orders = loadOrders(db);
  const results: OrderResult[] = orders.map((o) => computeOrder(o, ctx));
  const c = db.$client;

  let autoBound = 0;
  const write = c.transaction(() => {
    // Ad ile eşleşen satırların variant_id'si kalıcı olarak bağlanır (ad sonradan değişse de eşleştirme korunur).
    const hasVariant = c.prepare("select 1 from product_map where key_type = 'variant_id' and key_value = ?");
    const insMap = c.prepare(
      "insert into product_map (key_type, key_value, label, source, note, created_at) values ('variant_id', ?, ?, 'otomatik', 'ürün adından otomatik bağlandı', ?) returning id",
    );
    const insComp = c.prepare("insert into product_map_components (map_id, model_code, qty) values (?, ?, ?)");
    const lineInfo = new Map(orders.flatMap((o) => o.lines.map((l) => [l.id, l] as const)));
    for (const r of results) {
      for (const m of r.matches) {
        if (m.matchedBy !== "title" || !m.components) continue;
        const l = lineInfo.get(m.lineId);
        if (!l?.variantId || hasVariant.get(l.variantId)) continue;
        const row = insMap.get(l.variantId, l.name ?? l.title, new Date().toISOString()) as { id: number };
        for (const comp of m.components) insComp.run(row.id, comp.model, comp.qty);
        autoBound++;
      }
    }

    c.prepare("delete from order_calc").run();
    c.prepare("delete from line_calc").run();
    c.prepare("delete from refund_calc").run();
    const insO = c.prepare(
      `insert into order_calc values (@orderId, @name, @date, @included, @excludeReason, @dtc, @gross, @discount, @shippingCharged,
        @revenue, @cogs, @shippingCost, @commission, @commissionRate, @gateway, @gatewayKnown, @kdv, @capsules, @couple, @physical,
        @newCustomer, @unmatchedLines, @missingCostUnits)`,
    );
    const insR = c.prepare(
      "insert into refund_calc values (@refundId, @orderId, @date, @amount, @cogsBack, @kdvBack, @commissionBack, @returnShipping)",
    );
    const insL = c.prepare(
      `insert into line_calc (line_id, order_id, date, model_code, units, list_amount, discount, revenue, cogs, shipping_cost, commission,
        kdv, refunded_units, refund_amount, refund_cogs_back, refund_kdv_back, refund_commission_back)
       values (@lineId, @orderId, @date, @modelCode, @units, @listAmount, @discount, @revenue, @cogs, @shippingCost, @commission,
        @kdv, @refundedUnits, @refundAmount, @refundCogsBack, @refundKdvBack, @refundCommissionBack)`,
    );
    const b = (x: boolean) => (x ? 1 : 0);
    for (const r of results) {
      const o = r.order;
      insO.run({ ...o, included: b(o.included), dtc: b(o.dtc), gatewayKnown: b(o.gatewayKnown), couple: b(o.couple), physical: b(o.physical), newCustomer: b(o.newCustomer) });
      for (const x of r.refunds) insR.run(x);
      for (const x of r.lines) insL.run(x);
    }

    // Siparişlerdeki liste fiyatından geriye dönük fiyat geçmişi
    const insP = c.prepare(
      "insert or replace into price_history (variant_id, product_id, date, source, price, compare_at_price) values (?, ?, ?, 'siparis', ?, null)",
    );
    const dateOf = new Map(results.map((x) => [x.order.orderId, x.order.date]));
    for (const o of orders) {
      if (o.test) continue;
      const d = dateOf.get(o.id);
      if (!d) continue;
      for (const l of o.lines) if (l.variantId) insP.run(l.variantId, l.productId ?? null, d, l.originalUnitPrice);
    }
  });
  write();

  const days = rebuildDaily(db, ctx);
  const summary: RecalcSummary = {
    at: new Date().toISOString(),
    ms: Date.now() - t0,
    orders: orders.length,
    included: results.filter((r) => r.order.included).length,
    days,
    autoBound,
  };
  setJsonSetting("son_hesap", summary);
  return summary;
}

/** Günlük kâr tablosunu (şelale) baştan üretir. */
export function rebuildDaily(db: DB = getDb(), ctx: CalcContext = loadContext(db)): number {
  const c = db.$client;
  const fx = loadFxLookup();
  const today = todayIst();

  type Agg = Record<string, number>;
  const zero = (): Agg => ({ gross: 0, discount: 0, shippingCharged: 0, revenue: 0, refunds: 0, cogs: 0, shippingCost: 0, commission: 0, kdv: 0, meta: 0, other: 0, orders: 0, capsules: 0, couple: 0, newc: 0 });
  const days = new Map<string, Agg>();
  const get = (d: string) => {
    let a = days.get(d);
    if (!a) days.set(d, (a = zero()));
    return a;
  };

  const oc = c
    .prepare(
      `select date, sum(gross) gross, sum(discount) discount, sum(shipping_charged) sc, sum(revenue) revenue, sum(cogs) cogs,
              sum(shipping_cost) ship, sum(commission) comm, sum(kdv) kdv, sum(dtc) orders,
              sum(case when dtc = 1 then capsules else 0 end) capsules, sum(case when dtc = 1 and couple = 1 then 1 else 0 end) couple,
              sum(case when dtc = 1 and new_customer = 1 then 1 else 0 end) newc
         from order_calc where included = 1 group by date`,
    )
    .all() as Record<string, number | string>[];
  for (const r of oc) {
    const a = get(r.date as string);
    a.gross += r.gross as number;
    a.discount += r.discount as number;
    a.shippingCharged += r.sc as number;
    a.revenue += r.revenue as number;
    a.cogs += r.cogs as number;
    a.shippingCost += r.ship as number;
    a.commission += r.comm as number;
    a.kdv += r.kdv as number;
    a.orders += r.orders as number;
    a.capsules += r.capsules as number;
    a.couple += r.couple as number;
    a.newc += r.newc as number;
  }

  const rc = c
    .prepare(
      `select date, sum(amount) amount, sum(cogs_back) cb, sum(kdv_back) kb, sum(commission_back) cmb, sum(return_shipping) rs
         from refund_calc group by date`,
    )
    .all() as Record<string, number | string>[];
  for (const r of rc) {
    const a = get(r.date as string);
    a.refunds += r.amount as number;
    a.cogs -= r.cb as number;
    a.kdv -= r.kb as number;
    a.commission -= r.cmb as number;
    a.shippingCost += r.rs as number;
  }

  // Meta reklam: izinli hesapların hesap seviyesindeki günlük harcaması
  const metaRows = c
    .prepare(
      `select i.date, i.currency, sum(i.spend) spend, max(case when i.source = 'csv' then 1 else 0 end) csv from ad_insights_daily i
         join ad_accounts a on a.id = i.account_id and a.allowed = 1
        where i.level = 'account' group by i.date, i.currency`,
    )
    .all() as { date: string; currency: string | null; spend: number; csv: number }[];
  const metaSource = new Map<string, string>();
  const metaByDay = new Map<string, number>();
  for (const r of metaRows) {
    const rate = !r.currency || r.currency === "TRY" ? 1 : (fx(r.currency, r.date) ?? 0);
    get(r.date).meta += r.spend * rate;
    metaByDay.set(r.date, (metaByDay.get(r.date) ?? 0) + r.spend * rate);
    metaSource.set(r.date, r.csv ? "csv" : "meta");
  }

  // Meta verisi olmayan günler için TrueProfit aylık reklam harcaması yedeği:
  // ayın Meta/rapor ile kapsanmayan günlerine, ay toplamından kalan tutar eşit bölünür.
  const tp = c.prepare("select month, facebook_ad_spend spend from tp_monthly where facebook_ad_spend > 0").all() as { month: string; spend: number }[];
  for (const r of tp) {
    const from = `${r.month}-01`;
    const lastTp = (c.prepare("select max(date) d from tp_orders where substr(date, 1, 7) = ?").get(r.month) as { d: string | null }).d;
    const isLatestTpMonth = !tp.some((x) => x.month > r.month);
    let to = monthEnd(from);
    if (isLatestTpMonth && lastTp && lastTp < to) to = lastTp;
    if (to > today) to = today;
    const ds = eachDay(from, to);
    const uncovered = ds.filter((d) => !metaByDay.has(d));
    if (!uncovered.length) continue;
    const covered = ds.reduce((s, d) => s + (metaByDay.get(d) ?? 0), 0);
    const rest = Math.max(0, r.spend - covered);
    for (const d of uncovered) {
      get(d).meta += rest / uncovered.length;
      metaSource.set(d, "trueprofit");
    }
  }

  // Diğer pazarlama: UGC/hediye gönderimleri
  const ships = c.prepare("select date, model_code model, qty, with_shipping ws from marketing_shipments").all() as { date: string; model: string; qty: number; ws: number }[];
  for (const s of ships) get(s.date).other += (ctx.unitCost(s.model, s.date) ?? 0) * s.qty + (s.ws ? ctx.shippingCost(s.date) : 0);

  const fixed = c
    .prepare("select section, amount, currency, frequency, spread_months spreadMonths, start_date startDate, end_date endDate from fixed_costs")
    .all() as FixedCostIn[];

  const keys = [...days.keys()].sort();
  const first = minDate(keys[0], ...fixed.map((f) => (f.frequency === "tek" ? monthStart(f.startDate) : f.startDate)));
  if (!first) {
    c.prepare("delete from daily_pnl").run();
    return 0;
  }
  const last = keys.length && keys[keys.length - 1] > today ? keys[keys.length - 1] : today;
  const allDays = eachDay(first, last);
  let missingFx = 0;

  const ins = c.prepare(
    `insert into daily_pnl values (@date, @gross, @discount, @shippingCharged, @revenue, @refunds, @netRevenue, @cogs, @shippingCost,
      @commission, @kdv, @preAdProfit, @metaSpend, @metaSource, @otherMarketing, @postAdProfit, @fixedCompany, @companyNet,
      @fixedPersonal, @takeHome, @orders, @capsules, @coupleOrders, @newCustomerOrders)`,
  );
  c.transaction(() => {
    c.prepare("delete from daily_pnl").run();
    for (const d of allDays) {
      const a = days.get(d) ?? zero();
      const fx_ = fixedTotalsForDay(fixed, d, fx);
      if (fx_.missingFx) missingFx++;
      const netRevenue = a.revenue - a.refunds;
      const preAd = netRevenue - a.cogs - a.shippingCost - a.commission - a.kdv;
      const postAd = preAd - a.meta - a.other;
      const companyNet = postAd - fx_.sirket;
      ins.run({
        date: d,
        gross: a.gross,
        discount: a.discount,
        shippingCharged: a.shippingCharged,
        revenue: a.revenue,
        refunds: a.refunds,
        netRevenue,
        cogs: a.cogs,
        shippingCost: a.shippingCost,
        commission: a.commission,
        kdv: a.kdv,
        preAdProfit: preAd,
        metaSpend: a.meta,
        metaSource: metaSource.get(d) ?? "yok",
        otherMarketing: a.other,
        postAdProfit: postAd,
        fixedCompany: fx_.sirket,
        companyNet,
        fixedPersonal: fx_.kisisel,
        takeHome: companyNet - fx_.kisisel,
        orders: a.orders,
        capsules: a.capsules,
        coupleOrders: a.couple,
        newCustomerOrders: a.newc,
      });
    }
  })();
  setJsonSetting("kur_eksik_gun", missingFx);
  return allDays.length;
}
