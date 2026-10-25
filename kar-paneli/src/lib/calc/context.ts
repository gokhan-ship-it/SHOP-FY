// Hesap bağlamı: modeller, tarihli maliyetler, tarihli kurallar ve ürün → model eşleştirmesi.
// Saf veri yapısıdır; testler doğrudan kurabilir, uygulama veritabanından yükler.

export const CAPSULE_CATEGORIES = new Set(["bileklik", "kolye", "charm", "künye"]);
export const RESTOCK_TYPES = new Set(["RETURN", "CANCEL", "LEGACY_RESTOCK"]);

export interface ModelInfo {
  code: string;
  name: string;
  category: string;
  material: string | null;
}

export interface CostVersion {
  modelCode: string;
  unitCost: number | null;
  validFrom: string;
  validTo: string | null;
}

export interface Rule {
  type: string;
  unit: string;
  value: number;
  scope: string | null;
  validFrom: string;
  validTo: string | null;
}

export interface Component {
  model: string;
  qty: number;
}

export interface MapEntry {
  keyType: "variant_id" | "product_id" | "sku" | "title";
  keyValue: string;
  components: Component[];
}

export interface LineKey {
  title: string;
  variantTitle?: string | null;
  name?: string | null;
  sku?: string | null;
  productId?: string | null;
  variantId?: string | null;
}

export type MatchedBy = MapEntry["keyType"] | null;

/** Ürün adı karşılaştırması: büyük/küçük harf, fazla boşluk ve tire çevresi farkları yok sayılır. */
export function normTitle(s: string): string {
  return s
    .toLocaleLowerCase("tr-TR")
    .replace(/\s*-\s*/g, " - ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Ödeme yöntemi adı: "PayTR", "Paytr", "pay tr" → "paytr" */
export function normGateway(s: string): string {
  return s
    .toLowerCase()
    .replace(/ı/g, "i")
    .normalize("NFD")
    .replace(/[^a-z0-9]/g, "");
}

export class CalcContext {
  models = new Map<string, ModelInfo>();
  costs = new Map<string, CostVersion[]>();
  rules: Rule[] = [];
  private map = new Map<string, Component[]>();

  constructor(input: { models: ModelInfo[]; costs: CostVersion[]; rules: Rule[]; map: MapEntry[] }) {
    for (const m of input.models) this.models.set(m.code, m);
    for (const c of input.costs) {
      const arr = this.costs.get(c.modelCode) ?? [];
      arr.push(c);
      this.costs.set(c.modelCode, arr);
    }
    for (const arr of this.costs.values()) arr.sort((a, b) => a.validFrom.localeCompare(b.validFrom));
    this.rules = input.rules;
    for (const e of input.map) this.map.set(this.mapKey(e.keyType, e.keyValue), e.components);
  }

  private mapKey(type: string, value: string) {
    return type === "title" ? `title:${normTitle(value)}` : type === "sku" ? `sku:${value.trim().toLowerCase()}` : `${type}:${value}`;
  }

  /** Eşleştirme sırası: variant_id → product_id → sku → tam ürün adı. */
  resolve(line: LineKey): { components: Component[] | null; matchedBy: MatchedBy } {
    const tryKey = (type: MapEntry["keyType"], value: string | null | undefined) =>
      value ? this.map.get(this.mapKey(type, value)) : undefined;
    let c = tryKey("variant_id", line.variantId);
    if (c) return { components: c, matchedBy: "variant_id" };
    c = tryKey("product_id", line.productId);
    if (c) return { components: c, matchedBy: "product_id" };
    c = tryKey("sku", line.sku);
    if (c) return { components: c, matchedBy: "sku" };
    const vt = line.variantTitle && line.variantTitle !== "Default Title" ? line.variantTitle : null;
    const candidates = [line.name, line.title, vt ? `${line.title} ${vt}` : null, vt ? `${line.title} - ${vt}` : null];
    for (const t of candidates) {
      c = tryKey("title", t);
      if (c) return { components: c, matchedBy: "title" };
    }
    return { components: null, matchedBy: null };
  }

  addMapping(e: MapEntry) {
    this.map.set(this.mapKey(e.keyType, e.keyValue), e.components);
  }

  category(model: string): string | null {
    return this.models.get(model)?.category ?? null;
  }

  /** Sipariş tarihinde geçerli birim maliyet. null = sürüm yok ya da tutar boş. */
  unitCost(model: string, date: string): number | null {
    const arr = this.costs.get(model);
    if (!arr) return null;
    let hit: CostVersion | undefined;
    for (const v of arr) if (v.validFrom <= date && (!v.validTo || v.validTo >= date)) hit = v;
    return hit?.unitCost ?? null;
  }

  private rulesAt(type: string, date: string): Rule[] {
    return this.rules.filter((r) => r.type === type && r.validFrom <= date && (!r.validTo || r.validTo >= date));
  }

  shippingCost(date: string): number {
    const r = this.rulesAt("kargo", date).find((x) => x.unit === "siparis_basi_tl");
    return r?.value ?? 0;
  }

  /** Ödeme yöntemine göre komisyon oranı (0–1). known=false → varsayılan oran uygulandı. */
  commissionRate(gateway: string | null, date: string): { rate: number; known: boolean } {
    const rs = this.rulesAt("komisyon", date);
    const g = gateway ? normGateway(gateway) : "";
    if (g) {
      for (const r of rs) {
        if (!r.scope || r.scope.trim() === "*") continue;
        const scopes = r.scope.split(",").map(normGateway).filter(Boolean);
        if (scopes.some((s) => g === s || g.includes(s))) return { rate: r.value / 100, known: true };
      }
    }
    const def = rs.find((r) => !r.scope || r.scope.trim() === "*");
    return { rate: (def?.value ?? 0) / 100, known: false };
  }

  /** Kategoriye göre KDV oranı (0–1). */
  kdvRate(category: string | null, date: string): number {
    const rs = this.rulesAt("kdv", date);
    const cat = category ?? "bileklik"; // eşleşmeyen ürün: takı oranı (veri sağlığında uyarı çıkar)
    for (const r of rs) {
      const scopes = (r.scope ?? "").split(",").map((s) => s.trim());
      if (scopes.includes(cat)) return r.value / 100;
    }
    return 0;
  }

  refundSetting(unit: "komisyon_iade" | "iade_kargo_tl", date: string): number {
    return this.rulesAt("iade", date).find((r) => r.unit === unit)?.value ?? 0;
  }
}
