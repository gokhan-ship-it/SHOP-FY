import { CalcContext, type CostVersion, type MapEntry, type ModelInfo, type Rule } from "@/lib/calc/context";
import type { OrderIn } from "@/lib/calc/engine";

export const MODELS: ModelInfo[] = [
  { code: "astor-celik", name: "Astor", category: "bileklik", material: "çelik" },
  { code: "chloe-celik", name: "Chloe", category: "bileklik", material: "çelik" },
  { code: "luna-celik", name: "Luna", category: "bileklik", material: "çelik" },
  { code: "aurora-celik", name: "Aurora", category: "kolye", material: "çelik" },
  { code: "klasik-zaman-kapsulu-x", name: "Klasik", category: "klasik", material: null },
  { code: "event-dijital-x", name: "Event", category: "event", material: null },
];

export const COSTS: CostVersion[] = [
  { modelCode: "astor-celik", unitCost: 100, validFrom: "2023-01-01", validTo: null },
  { modelCode: "chloe-celik", unitCost: 100, validFrom: "2023-01-01", validTo: null },
  { modelCode: "luna-celik", unitCost: 100, validFrom: "2023-01-01", validTo: null },
  { modelCode: "aurora-celik", unitCost: 250, validFrom: "2023-01-01", validTo: null },
  { modelCode: "klasik-zaman-kapsulu-x", unitCost: 300, validFrom: "2023-01-01", validTo: null },
  { modelCode: "event-dijital-x", unitCost: 0, validFrom: "2023-01-01", validTo: null },
];

export const RULES: Rule[] = [
  { type: "kargo", unit: "siparis_basi_tl", value: 60, scope: null, validFrom: "2023-01-01", validTo: null },
  { type: "komisyon", unit: "yuzde", value: 5, scope: "paytr", validFrom: "2023-01-01", validTo: null },
  { type: "komisyon", unit: "yuzde", value: 3, scope: "*", validFrom: "2023-01-01", validTo: null },
  { type: "kdv", unit: "yuzde", value: 0.8333, scope: "bileklik,kolye,charm,künye,ek_ürün", validFrom: "2023-01-01", validTo: null },
  { type: "kdv", unit: "yuzde", value: 16.6667, scope: "klasik,event", validFrom: "2023-01-01", validTo: null },
  { type: "iade", unit: "komisyon_iade", value: 0, scope: null, validFrom: "2023-01-01", validTo: null },
  { type: "iade", unit: "iade_kargo_tl", value: 0, scope: null, validFrom: "2023-01-01", validTo: null },
];

export const MAP: MapEntry[] = [
  { keyType: "title", keyValue: "Astor + Chloe Couple Zaman Kapsülü", components: [{ model: "astor-celik", qty: 1 }, { model: "chloe-celik", qty: 1 }] },
  { keyType: "title", keyValue: "Luna - 316L Çelik", components: [{ model: "luna-celik", qty: 1 }] },
  { keyType: "title", keyValue: "Chloe - 316L Cerrahi Çelik", components: [{ model: "chloe-celik", qty: 1 }] },
  { keyType: "title", keyValue: "Klasik Zaman Kapsülü", components: [{ model: "klasik-zaman-kapsulu-x", qty: 1 }] },
  { keyType: "title", keyValue: "Event Bileti", components: [{ model: "event-dijital-x", qty: 1 }] },
];

export function ctx(over: Partial<{ costs: CostVersion[]; rules: Rule[]; map: MapEntry[] }> = {}) {
  return new CalcContext({ models: MODELS, costs: over.costs ?? COSTS, rules: over.rules ?? RULES, map: over.map ?? MAP });
}

let n = 0;
export function order(p: Partial<Omit<OrderIn, "lines">> & { lines?: Partial<OrderIn["lines"][number]>[] }): OrderIn {
  n++;
  return {
    id: p.id ?? `gid://shopify/Order/${n}`,
    name: p.name ?? `#${1000 + n}`,
    createdAt: p.createdAt ?? "2026-03-10T10:00:00Z",
    cancelledAt: p.cancelledAt ?? null,
    test: p.test ?? false,
    totalPrice: p.totalPrice ?? 0,
    shippingCharged: p.shippingCharged ?? 0,
    gateways: p.gateways ?? ["PayTR"],
    customerId: p.customerId ?? null,
    customerOrderIndex: p.customerOrderIndex ?? 1,
    fulfillmentCount: p.fulfillmentCount ?? 1,
    refunds: p.refunds ?? [],
    lines: (p.lines ?? []).map((l, i) => ({
      id: l.id ?? `gid://shopify/LineItem/${n}${i}`,
      title: l.title ?? "",
      variantTitle: l.variantTitle ?? null,
      name: l.name ?? l.title ?? "",
      sku: l.sku ?? null,
      quantity: l.quantity ?? 1,
      originalUnitPrice: l.originalUnitPrice ?? 0,
      discountAllocated: l.discountAllocated ?? 0,
      productId: l.productId ?? null,
      variantId: l.variantId ?? null,
    })),
  };
}
