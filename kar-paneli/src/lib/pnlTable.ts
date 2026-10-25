// Kâr tablosu satırları (brief §7.4 şelale) — ekran ve dışa aktarma ortak kullanır.
import { series, totals, type Grain, type PnlField } from "./metrics";
import { bucketLabel } from "./pageparams";

export interface PnlRow {
  label: string;
  field?: PnlField;
  sign?: "-" | "+";
  kind: "line" | "total" | "count";
}

export const PNL_ROWS: PnlRow[] = [
  { label: "Brüt satış", field: "gross", kind: "line" },
  { label: "İndirimler", field: "discount", sign: "-", kind: "line" },
  { label: "Müşteriden alınan kargo", field: "shipping_charged", sign: "+", kind: "line" },
  { label: "CİRO", field: "revenue", kind: "total" },
  { label: "İadeler", field: "refunds", sign: "-", kind: "line" },
  { label: "NET CİRO", field: "net_revenue", kind: "total" },
  { label: "Ürün maliyeti", field: "cogs", sign: "-", kind: "line" },
  { label: "Kargo", field: "shipping_cost", sign: "-", kind: "line" },
  { label: "Komisyon", field: "commission", sign: "-", kind: "line" },
  { label: "KDV (işçilik)", field: "kdv", sign: "-", kind: "line" },
  { label: "REKLAM ÖNCESİ KÂR", field: "pre_ad_profit", kind: "total" },
  { label: "Meta reklam", field: "meta_spend", sign: "-", kind: "line" },
  { label: "Diğer pazarlama (UGC/hediye)", field: "other_marketing", sign: "-", kind: "line" },
  { label: "REKLAM SONRASI KÂR", field: "post_ad_profit", kind: "total" },
  { label: "Şirket sabit giderleri", field: "fixed_company", sign: "-", kind: "line" },
  { label: "ŞİRKET NET KÂRI", field: "company_net", kind: "total" },
  { label: "Kişisel giderler", field: "fixed_personal", sign: "-", kind: "line" },
  { label: "SANA KALAN", field: "take_home", kind: "total" },
  { label: "Sipariş (DTC)", field: "orders", kind: "count" },
  { label: "Kapsül adedi", field: "capsules", kind: "count" },
];

export function pnlMatrix(from: string, to: string, grain: Grain) {
  const buckets = series(from, to, grain);
  const t = totals(from, to);
  const cols = buckets.map((b) => ({ key: b.key, label: bucketLabel(b.key, grain), values: b as unknown as Record<string, number> }));
  // Brüt − indirim + kargo ciroyu tutmuyorsa (ör. bahşiş, hediye çeki) fark satırı gösterilir
  const recon = (v: Record<string, number>) => v.revenue - (v.gross - v.discount + v.shipping_charged);
  const needRecon = cols.some((c) => Math.abs(recon(c.values)) > 1) || Math.abs(recon(t as unknown as Record<string, number>)) > 1;
  return { cols, total: t as unknown as Record<string, number>, needRecon, recon };
}
