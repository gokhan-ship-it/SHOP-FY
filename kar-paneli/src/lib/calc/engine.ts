// Sipariş ve iade hesapları (brief §7.1–7.3). Saf fonksiyonlar; veritabanına dokunmaz.
import { istDate } from "../time";
import { CAPSULE_CATEGORIES, RESTOCK_TYPES, type CalcContext, type Component, type MatchedBy } from "./context";

export interface LineIn {
  id: string;
  title: string;
  variantTitle?: string | null;
  name?: string | null;
  sku?: string | null;
  quantity: number;
  originalUnitPrice: number;
  discountAllocated: number;
  productId?: string | null;
  variantId?: string | null;
}

export interface RefundLineIn {
  lineItemId: string;
  quantity: number;
  restockType: string | null;
  subtotal: number;
}

export interface RefundIn {
  id: string;
  createdAt: string;
  totalRefunded: number;
  lines: RefundLineIn[];
}

export interface OrderIn {
  id: string;
  name: string;
  createdAt: string;
  cancelledAt?: string | null;
  test?: boolean;
  totalPrice: number;
  shippingCharged: number;
  gateways: string[];
  customerId?: string | null;
  /** Müşterinin kaçıncı siparişi (1 = ilk). Bilinmiyorsa null. */
  customerOrderIndex?: number | null;
  fulfillmentCount: number;
  lines: LineIn[];
  refunds: RefundIn[];
}

export interface OrderCalcOut {
  orderId: string;
  name: string;
  date: string;
  included: boolean;
  excludeReason: string | null;
  dtc: boolean;
  gross: number;
  discount: number;
  shippingCharged: number;
  revenue: number;
  cogs: number;
  shippingCost: number;
  commission: number;
  commissionRate: number;
  gateway: string | null;
  gatewayKnown: boolean;
  kdv: number;
  capsules: number;
  couple: boolean;
  physical: boolean;
  newCustomer: boolean;
  unmatchedLines: number;
  missingCostUnits: number;
}

export interface RefundCalcOut {
  refundId: string;
  orderId: string;
  date: string;
  amount: number;
  cogsBack: number;
  kdvBack: number;
  commissionBack: number;
  returnShipping: number;
}

/** Ürün ekranı kırılımı: satır × model bileşeni. İadeler sipariş tarihine bağlıdır. */
export interface LineCalcOut {
  lineId: string;
  orderId: string;
  date: string;
  modelCode: string | null;
  units: number;
  listAmount: number;
  discount: number;
  revenue: number;
  cogs: number;
  shippingCost: number;
  commission: number;
  kdv: number;
  refundedUnits: number;
  refundAmount: number;
  refundCogsBack: number;
  refundKdvBack: number;
  refundCommissionBack: number;
}

export interface LineMatch {
  lineId: string;
  matchedBy: MatchedBy;
  components: Component[] | null;
}

export interface OrderResult {
  order: OrderCalcOut;
  refunds: RefundCalcOut[];
  lines: LineCalcOut[];
  matches: LineMatch[];
}

const r2 = (n: number) => Math.round(n * 100) / 100;

/** Pay dağıtımı: ağırlıklar toplamı 0 ise eşit dağıtır. */
function shares(weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum > 0) return weights.map((w) => w / sum);
  return weights.map(() => (weights.length ? 1 / weights.length : 0));
}

interface CompDetail {
  model: string | null;
  units: number; // satır adedi × bileşen adedi
  unitCost: number;
  costKnown: boolean;
  category: string | null;
}

export function computeOrder(o: OrderIn, ctx: CalcContext): OrderResult {
  const date = istDate(o.createdAt);
  let excludeReason: string | null = null;
  if (o.test) excludeReason = "test";
  else if (o.cancelledAt && o.fulfillmentCount === 0) excludeReason = "gönderilmeden iptal";
  const included = excludeReason === null;

  const revenue = o.totalPrice;
  const gross = o.lines.reduce((s, l) => s + l.originalUnitPrice * l.quantity, 0);
  const discount = o.lines.reduce((s, l) => s + l.discountAllocated, 0);

  // Satır bileşenleri
  const matches: LineMatch[] = [];
  const comps: CompDetail[][] = o.lines.map((l) => {
    const { components, matchedBy } = ctx.resolve(l);
    matches.push({ lineId: l.id, matchedBy, components });
    if (!components) return [{ model: null, units: l.quantity, unitCost: 0, costKnown: false, category: null }];
    return components.map((c) => {
      const uc = ctx.unitCost(c.model, date);
      return { model: c.model, units: c.qty * l.quantity, unitCost: uc ?? 0, costKnown: uc !== null, category: ctx.category(c.model) };
    });
  });

  const unmatchedLines = matches.filter((m) => !m.components).length;
  const missingCostUnits = comps.flat().filter((c) => c.model && !c.costKnown).reduce((s, c) => s + c.units, 0);
  const lineCogs = comps.map((cs) => cs.reduce((s, c) => s + c.unitCost * c.units, 0));
  const cogs = lineCogs.reduce((a, b) => a + b, 0);
  const capsules = comps.flat().filter((c) => c.category && CAPSULE_CATEGORIES.has(c.category)).reduce((s, c) => s + c.units, 0);
  // Fiziksel ürün: event dışındaki her bileşen; eşleşmeyen satır da fiziksel sayılır.
  const physical = comps.flat().some((c) => c.category !== "event");
  const shippingCost = physical ? ctx.shippingCost(date) : 0;

  const gateway = o.gateways.find((g) => g && g.trim()) ?? null;
  const { rate: commissionRate, known } = ctx.commissionRate(gateway, date);
  const commission = revenue * commissionRate;
  const gatewayKnown = known || revenue <= 0;

  // Kâr tablosu için satır cirosu: sipariş cirosu, satırların indirimli tutarına oranla
  const netWeights = o.lines.map((l) => Math.max(0, l.originalUnitPrice * l.quantity - l.discountAllocated));
  const listWeights = o.lines.map((l) => l.originalUnitPrice * l.quantity);
  const pnlShares = netWeights.some((w) => w > 0) ? shares(netWeights) : shares(listWeights);

  // Bileşen payı satır içinde: maliyet oranında, maliyet yoksa adet oranında
  const compShares = comps.map((cs) => {
    const w = cs.map((c) => c.unitCost * c.units);
    return w.some((x) => x > 0) ? shares(w) : shares(cs.map((c) => c.units));
  });

  let kdv = 0;
  o.lines.forEach((_, i) => {
    const lineRev = revenue * pnlShares[i];
    comps[i].forEach((c, j) => {
      kdv += lineRev * compShares[i][j] * ctx.kdvRate(c.category, date);
    });
  });

  const dtc = included && revenue > 0 && comps.flat().some((c) => c.category !== "event");
  const newCustomer = dtc && (o.customerOrderIndex === null || o.customerOrderIndex === undefined || o.customerOrderIndex <= 1);

  const order: OrderCalcOut = {
    orderId: o.id,
    name: o.name,
    date,
    included,
    excludeReason,
    dtc,
    gross: r2(gross),
    discount: r2(discount),
    shippingCharged: r2(o.shippingCharged),
    revenue: r2(revenue),
    cogs: r2(cogs),
    shippingCost,
    commission: r2(commission),
    commissionRate,
    gateway,
    gatewayKnown,
    kdv: r2(kdv),
    capsules,
    couple: capsules >= 2,
    physical,
    newCustomer,
    unmatchedLines,
    missingCostUnits,
  };

  if (!included) return { order, refunds: [], lines: [], matches };

  // ---------- İadeler (kâr tablosu: iade günü) ----------
  const lineById = new Map(o.lines.map((l, i) => [l.id, i]));
  const unitCostOfLine = (i: number) => (o.lines[i].quantity ? lineCogs[i] / o.lines[i].quantity : 0);
  const kdvRatio = revenue > 0 ? kdv / revenue : 0;
  const commissionBackOn = ctx.refundSetting("komisyon_iade", date) > 0;

  const refunds: RefundCalcOut[] = o.refunds.map((rf) => {
    const rdate = istDate(rf.createdAt);
    let cogsBack = 0;
    for (const rl of rf.lines) {
      const i = lineById.get(rl.lineItemId);
      if (i === undefined || !rl.restockType || !RESTOCK_TYPES.has(rl.restockType)) continue;
      cogsBack += unitCostOfLine(i) * rl.quantity;
    }
    const amount = rf.totalRefunded;
    return {
      refundId: rf.id,
      orderId: o.id,
      date: rdate,
      amount: r2(amount),
      cogsBack: r2(cogsBack),
      kdvBack: r2(amount * kdvRatio),
      commissionBack: commissionBackOn ? r2(amount * commissionRate) : 0,
      returnShipping: amount > 0 ? ctx.refundSetting("iade_kargo_tl", rdate) : 0,
    };
  });

  // ---------- Ürün ekranı kırılımı (sipariş günü) ----------
  // İndirim ve ciro satırlara liste fiyatına oranla; kargo, komisyon ve KDV satır cirosuna oranla dağıtılır.
  const prodShares = shares(listWeights);
  const lineRefund = o.lines.map(() => ({ units: 0, amount: 0, cogsBack: 0 }));
  for (const rf of o.refunds) {
    const subs = rf.lines.map((rl) => (lineById.has(rl.lineItemId) ? Math.max(0, rl.subtotal) : 0));
    const subSum = subs.reduce((a, b) => a + b, 0);
    const alloc = subSum > 0 ? null : prodShares;
    rf.lines.forEach((rl, k) => {
      const i = lineById.get(rl.lineItemId);
      if (i === undefined) return;
      lineRefund[i].units += rl.quantity;
      if (subSum > 0) lineRefund[i].amount += (rf.totalRefunded * subs[k]) / subSum;
      if (rl.restockType && RESTOCK_TYPES.has(rl.restockType)) lineRefund[i].cogsBack += unitCostOfLine(i) * rl.quantity;
    });
    if (alloc) alloc.forEach((s, i) => (lineRefund[i].amount += rf.totalRefunded * s));
  }

  const lines: LineCalcOut[] = [];
  o.lines.forEach((l, i) => {
    const lineRev = revenue * prodShares[i];
    const lineDisc = discount * prodShares[i];
    const rs = revenue > 0 ? lineRev / revenue : prodShares[i];
    comps[i].forEach((c, j) => {
      const s = compShares[i][j];
      const refAmt = lineRefund[i].amount * s;
      lines.push({
        lineId: l.id,
        orderId: o.id,
        date,
        modelCode: c.model,
        units: c.units,
        listAmount: r2(listWeights[i] * s),
        discount: r2(lineDisc * s),
        revenue: r2(lineRev * s),
        cogs: r2(c.unitCost * c.units),
        shippingCost: r2(shippingCost * rs * s),
        commission: r2(commission * rs * s),
        kdv: r2(kdv * rs * s),
        refundedUnits: (lineRefund[i].units * c.units) / Math.max(1, l.quantity),
        refundAmount: r2(refAmt),
        refundCogsBack: r2(lineRefund[i].cogsBack * (lineCogs[i] > 0 ? (c.unitCost * c.units) / lineCogs[i] : s)),
        refundKdvBack: r2(refAmt * kdvRatio),
        refundCommissionBack: commissionBackOn ? r2(refAmt * commissionRate) : 0,
      });
    });
  });

  return { order, refunds, lines, matches };
}
