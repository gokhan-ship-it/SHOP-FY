// seed/ ve trueprofit/ klasörlerindeki hazır verileri veritabanına alır.
// Elle düzenlenebilen tablolar (model, eşleştirme, maliyet, kural) yalnızca boşken doldurulur;
// referans tabloları (TrueProfit, doğrulama) her açılışta tazelenir.
import fs from "node:fs";
import path from "node:path";
import { sql } from "drizzle-orm";
import type { DB } from "./db";
import { schema } from "./db";
import { parseCsvObjects } from "./csv";
import { SEED_DIR, TP_DIR } from "./paths";
import { allowedAdAccounts, BLOCKED_AD_ACCOUNTS, env, normalizeDomain } from "./config";

const nowIso = () => new Date().toISOString();

function readCsv(dir: string, file: string): Record<string, string>[] | null {
  const p = path.join(dir, file);
  if (!fs.existsSync(p)) return null;
  return parseCsvObjects(fs.readFileSync(p, "utf8"));
}

function count(db: DB, table: string): number {
  return (db.$client.prepare(`select count(*) c from ${table}`).get() as { c: number }).c;
}

/** "model×2 + model2×1" → [{model, qty}] */
export function parseComponents(s: string): { model: string; qty: number }[] {
  return s
    .split("+")
    .map((p) => p.trim())
    .filter(Boolean)
    .map((p) => {
      // "kod×2", "kod*2" ya da "kod x2"; model kodunun kendisi "x" ile bitebilir (klasik-zaman-kapsulu-x)
      const m = /^(.+?)\s*(?:×|\*|\sx)\s*(\d+)$/.exec(p);
      return m ? { model: m[1].trim(), qty: Number(m[2]) || 1 } : { model: p, qty: 1 };
    });
}

/** TrueProfit sayıları: "1,234.56", "(1,234.56)" → mutlak değer */
function tpNum(s: string | undefined): number | null {
  if (s === undefined || s === "") return null;
  const n = Number(s.replace(/[(),\s%]/g, ""));
  return Number.isFinite(n) ? Math.abs(n) : null;
}

const EN_MONTHS: Record<string, string> = { Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06", Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12" };

export function ensureStructure(db: DB) {
  if (!count(db, "brands")) db.insert(schema.brands).values({ id: 1, name: "Text To Next" }).run();
  const domain = normalizeDomain(env("SHOPIFY_STORE_DOMAIN"));
  if (domain) {
    db.insert(schema.stores)
      .values({ brandId: 1, domain, currency: "TRY", timezone: "Europe/Istanbul" })
      .onConflictDoNothing()
      .run();
  }
  const allowed = new Set(allowedAdAccounts());
  // İzin listesindekiler + bilinen ama izinsiz hesaplar (yalnızca görünürlük için; veri çekilmez)
  const known = [...allowed, "act_546353009221329", "act_538589571783419", ...BLOCKED_AD_ACCOUNTS];
  for (const id of known) {
    db.insert(schema.adAccounts)
      .values({ id, brandId: 1, storeId: 1, allowed: allowed.has(id) && !BLOCKED_AD_ACCOUNTS.includes(id) ? 1 : 0 })
      .onConflictDoUpdate({ target: schema.adAccounts.id, set: { allowed: allowed.has(id) && !BLOCKED_AD_ACCOUNTS.includes(id) ? 1 : 0 } })
      .run();
  }
}

export function importSeed(db: DB): string[] {
  const log: string[] = [];
  db.$client.transaction(() => {
    const t = db;

    const models = readCsv(SEED_DIR, "modeller.csv");
    if (models && !count(t, "models")) {
      for (const r of models)
        t.insert(schema.models).values({ code: r.model_kodu, name: r.model_adi, category: r.kategori, material: r.malzeme || null }).run();
      log.push(`${models.length} model`);
    }

    const map = readCsv(SEED_DIR, "urun_eslestirme.csv");
    if (map && !count(t, "product_map")) {
      for (const r of map) {
        const ins = t
          .insert(schema.productMap)
          .values({ keyType: "title", keyValue: r.shopify_urun_adi, label: r.shopify_urun_adi, source: "seed", note: r.not || null, createdAt: nowIso() })
          .returning({ id: schema.productMap.id })
          .get();
        for (const c of parseComponents(r.bilesenler))
          t.insert(schema.productMapComponents).values({ mapId: ins.id, modelCode: c.model, qty: c.qty }).run();
      }
      log.push(`${map.length} ürün adı eşleştirmesi`);
    }

    const costs = readCsv(SEED_DIR, "maliyetler.csv");
    if (costs && !count(t, "cost_versions")) {
      for (const r of costs)
        t.insert(schema.costVersions)
          .values({
            modelCode: r.model_kodu,
            unitCost: r.birim_maliyet_tl === "" ? null : Number(r.birim_maliyet_tl),
            validFrom: r.gecerlilik_baslangic || "2023-01-01",
            validTo: r.gecerlilik_bitis || null,
            breakdown: r.kirilim || null,
            note: r.kaynak_not || null,
          })
          .run();
      log.push(`${costs.length} maliyet sürümü`);
    }

    const rules = readCsv(SEED_DIR, "kurallar.csv");
    if (rules && !count(t, "rules")) {
      for (const r of rules)
        t.insert(schema.rules)
          .values({
            type: r.tur,
            unit: r.birim,
            value: Number(r.deger),
            scope: r.kapsam || null,
            note: r.aciklama || null,
            validFrom: r.gecerlilik_baslangic || "2023-01-01",
            validTo: r.gecerlilik_bitis || null,
          })
          .run();
      log.push(`${rules.length} kural`);
    }

    const ref = readCsv(SEED_DIR, "dogrulama_referans.csv");
    if (ref) {
      t.run(sql`delete from validation_reference`);
      for (const r of ref)
        t.insert(schema.validationReference)
          .values({
            month: r.ay,
            orders: Number(r.siparis_dtc),
            capsules: Number(r.kapsul_adedi),
            netRevenue: Number(r.ciro_net_iade_sonrasi),
            cogs: Number(r.urun_maliyeti),
            shipping: Number(r.kargo),
            commission: Number(r.komisyon),
            kdv: Number(r.kdv_iscilik),
            metaSpend: Number(r.meta_reklam),
            postAdProfit: Number(r.reklam_sonrasi_kar),
          })
          .run();
    }

    if (fs.existsSync(TP_DIR)) {
      const files = fs.readdirSync(TP_DIR);
      for (const f of files.filter((f) => /^tp_dashboard_.*\.csv$/.test(f))) {
        for (const r of readCsv(TP_DIR, f) ?? []) {
          const m = /^([A-Z][a-z]{2}) (\d{4})$/.exec(r.Date ?? "");
          if (!m) continue;
          const month = `${m[2]}-${EN_MONTHS[m[1]]}`;
          const row = {
            month,
            grossSales: tpNum(r["Gross Sales"]),
            discounts: tpNum(r.Discounts),
            refunds: tpNum(r.Refunds),
            revenue: tpNum(r.Revenue),
            cogs: tpNum(r.COGS),
            shippingCosts: tpNum(r["Shipping Costs"]),
            shippingCharged: tpNum(r["Shipping Charged"]),
            transactionFees: tpNum(r["Transaction Fees"]),
            taxesCollected: tpNum(r["Taxes Collected"]),
            adSpend: tpNum(r["Total Ad Spend"]),
            facebookAdSpend: tpNum(r["FACEBOOK Ad Spend"]),
            netProfit: Number((r["Net Profit"] ?? "0").replace(/,/g, "").replace(/^\((.*)\)$/, "-$1")),
          };
          t.insert(schema.tpMonthly).values(row).onConflictDoUpdate({ target: schema.tpMonthly.month, set: row }).run();
        }
      }
      let n = 0;
      for (const f of files.filter((f) => /^tp_siparisler_.*\.csv$/.test(f))) {
        for (const r of readCsv(TP_DIR, f) ?? []) {
          if (!r["ORDER CODE"]) continue;
          const row = {
            orderCode: r["ORDER CODE"],
            date: r.DATE,
            items: r.ITEMS,
            revenue: tpNum(r.REVENUE),
            shippingCost: tpNum(r["SHIPPING COST"]),
            totalCogs: tpNum(r["TOTAL COGS"]),
            transactionFee: tpNum(r["TRANSACTION FEE"]),
            grossProfit: Number((r["GROSS PROFIT"] ?? "0").replace(/,/g, "")),
          };
          t.insert(schema.tpOrders).values(row).onConflictDoUpdate({ target: schema.tpOrders.orderCode, set: row }).run();
          n++;
        }
      }
      if (n) log.push(`${n} TrueProfit siparişi`);
    }
  })();
  ensureStructure(db);
  return log;
}
