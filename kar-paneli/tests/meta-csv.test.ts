import { beforeEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import ExcelJS from "exceljs";
import { writeEnv } from "@/lib/config";
import { ENV_PATH } from "@/lib/paths";
import { importReport, parseAmount, parseDay, parseReport, readReportFile } from "@/lib/metaCsv";
import { recalcAll } from "@/lib/calc/recalc";
import { getLockErrors } from "@/lib/sync/log";
import { parseCsv, detectDelimiter } from "@/lib/csv";
import { freshDb, insertOrder } from "./db";
import type { DB } from "@/lib/db";

let db: DB;
const table = (csv: string) => parseCsv(csv, detectDelimiter(csv));
const day = (d: string) => db.$client.prepare("select meta_spend, meta_source from daily_pnl where date = ?").get(d) as { meta_spend: number; meta_source: string } | undefined;

beforeEach(() => {
  db = freshDb();
  if (fs.existsSync(ENV_PATH)) fs.rmSync(ENV_PATH);
  writeEnv({ META_ALLOWED_AD_ACCOUNTS: "act_426980502817664" });
  db.$client.prepare("insert into brands (id, name) values (1, 'Text To Next')").run();
  db.$client.prepare("insert into ad_accounts (id, brand_id, allowed) values ('act_426980502817664', 1, 1)").run();
});

describe("sayı ve tarih okuma", () => {
  it("Türkçe ve İngilizce sayı biçimleri", () => {
    expect(parseAmount("1.234,56")).toBe(1234.56);
    expect(parseAmount("1234.56")).toBe(1234.56);
    expect(parseAmount("1,234.56")).toBe(1234.56);
    expect(parseAmount("₺2.148,58")).toBe(2148.58);
    expect(parseAmount("320,67 TL")).toBe(320.67);
    expect(parseAmount("12.345")).toBe(12345);
    expect(parseAmount("0.5")).toBe(0.5);
    expect(parseAmount("")).toBeNull();
  });
  it("tarih biçimleri", () => {
    expect(parseDay("2026-10-20")).toBe("2026-10-20");
    expect(parseDay("20.10.2026")).toBe("2026-10-20");
    expect(parseDay("20/10/2026")).toBe("2026-10-20");
    expect(parseDay("10/20/2026")).toBe("2026-10-20");
  });
});

describe("Ads Manager raporu", () => {
  const TR = `"Raporlama başlangıcı","Raporlama bitişi","Kampanya adı","Gün","Harcanan tutar (TRY)","Gösterim","Bağlantı tıklamaları"
"2026-10-20","2026-10-20","Broad - Couple","2026-10-20","1000,50","1000","10"
"2026-10-20","2026-10-20","UGC - Aud 1","2026-10-20","500","800","5"
"2026-10-21","2026-10-21","Broad - Couple","2026-10-21","1200","1100","12"
"2026-10-20","2026-10-21","","","2700,50","",""`;

  it("kampanya düzeyinde gün kırılımlı Türkçe raporu okur; toplam satırını atlar", () => {
    const p = parseReport(table(TR), "Text-To-Next-Kampanyalar.csv");
    expect(p.level).toBe("campaign");
    expect(p.currency).toBe("TRY");
    expect(p.rows).toHaveLength(3);
    expect(p.skippedTotals).toBe(1);
  });

  it("içe aktarınca günlük reklam harcaması kâr tablosuna yazılır; aynı günleri tekrar yüklemek iki kez saymaz", () => {
    insertOrder(db, { createdAt: "2026-10-20T09:00:00Z", total: 2000, lines: [{ title: "Luna - 316L Çelik", price: 2000 }] });
    recalcAll(db);
    const s = importReport(parseReport(table(TR)));
    expect(s).toMatchObject({ account: "act_426980502817664", from: "2026-10-20", to: "2026-10-21", days: 2, total: 2700.5 });
    expect(day("2026-10-20")).toEqual({ meta_spend: 1500.5, meta_source: "csv" });
    expect(day("2026-10-21")).toEqual({ meta_spend: 1200, meta_source: "csv" });
    importReport(parseReport(table(TR)));
    expect(day("2026-10-20")!.meta_spend).toBe(1500.5);
    const camp = db.$client.prepare("select count(*) n from ad_insights_daily where level = 'campaign'").get() as { n: number };
    expect(camp.n).toBe(3);
  });

  it("noktalı virgüllü ve İngilizce başlıklı raporu okur", () => {
    const EN = `Day;Campaign name;Amount spent (TRY);Impressions\n20.10.2026;Broad;1.234,56;1000\n21.10.2026;Broad;100;50`;
    const p = parseReport(table(EN));
    expect(p.rows.map((r) => [r.date, r.spend])).toEqual([
      ["2026-10-20", 1234.56],
      ["2026-10-21", 100],
    ]);
  });

  it("gün kırılımı olmayan (çok günlük) rapor reddedilir", () => {
    const multi = `Raporlama başlangıcı,Raporlama bitişi,Kampanya adı,Harcanan tutar (TRY)\n2026-10-01,2026-10-24,Broad,5000`;
    expect(() => parseReport(table(multi))).toThrow(/Gün/);
  });

  it("JantiFox raporu reddedilir ve kilit uyarısı oluşur; hiçbir şey yazılmaz", () => {
    const jf = `Gün,Hesap adı,Kampanya adı,Harcanan tutar (TRY)\n2026-10-20,JantiFox,Jant,999`;
    expect(() => parseReport(table(jf), "rapor.csv")).toThrow(/JantiFox/);
    expect(getLockErrors().some((l) => l.source === "meta")).toBe(true);
    expect((db.$client.prepare("select count(*) n from ad_insights_daily").get() as { n: number }).n).toBe(0);
    // doğru hesabın raporu yüklenince kırmızı uyarı kalkar
    importReport(parseReport(table(TR)));
    expect(getLockErrors().some((l) => l.source === "meta")).toBe(false);
  });

  it("izin listesinde olmayan hesap numarası reddedilir", () => {
    const other = `Gün,Hesap kimliği,Harcanan tutar (TRY)\n2026-10-20,546353009221329,50`;
    expect(() => importReport(parseReport(table(other)))).toThrow(/izin listesinde olmayan/);
    expect((db.$client.prepare("select count(*) n from ad_insights_daily").get() as { n: number }).n).toBe(0);
  });

  it("Text To Next dışında bir hesap adı reddedilir", () => {
    const other = `Gün,Hesap adı,Harcanan tutar (TRY)\n2026-10-20,Başka Mağaza,50`;
    expect(() => importReport(parseReport(table(other)))).toThrow(/eşleşmiyor/);
    const ok = `Gün,Hesap adı,Harcanan tutar (TRY)\n2026-10-20,Text To Next,50`;
    expect(importReport(parseReport(table(ok))).accountVerified).toBe(true);
  });

  it("Excel (.xlsx) raporu da okunur", async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet("Rapor");
    ws.addRow(["Gün", "Kampanya adı", "Harcanan tutar (TRY)"]);
    ws.addRow([new Date(Date.UTC(2026, 9, 20)), "Broad", 321.5]);
    const buf = await wb.xlsx.writeBuffer();
    const t = await readReportFile("rapor.xlsx", buf as ArrayBuffer);
    expect(parseReport(t).rows[0]).toMatchObject({ date: "2026-10-20", spend: 321.5 });
  });
});

describe("TrueProfit yedeği ile birlikte", () => {
  it("ayın raporla kapsanmayan günlerine TrueProfit toplamından kalan pay eşit dağıtılır", () => {
    const c = db.$client;
    c.prepare("insert into tp_monthly (month, facebook_ad_spend) values ('2026-09', 3000)").run();
    c.prepare("insert into tp_orders (order_code, date, revenue) values ('#1', '2026-09-30', 100), ('#0', '2026-10-01', 100)").run();
    c.prepare("insert into tp_monthly (month, facebook_ad_spend) values ('2026-10', 1)").run();
    insertOrder(db, { createdAt: "2026-09-01T09:00:00Z", total: 1000, lines: [{ title: "Luna - 316L Çelik", price: 1000 }] });
    recalcAll(db);
    expect(day("2026-09-05")).toEqual({ meta_spend: 100, meta_source: "trueprofit" });
    // Eylül'ün son 10 günü rapordan: 10 × 150 = 1500 → kalan 1500, ilk 20 güne günde 75
    const rows = Array.from({ length: 10 }, (_, i) => `2026-09-${21 + i},Broad,150`).join("\n");
    const s = importReport(parseReport(table(`Gün,Kampanya adı,Harcanan tutar (TRY)\n${rows}`)));
    expect(s.tpCompare).toEqual([]); // ayın yalnızca bir kısmı → karşılaştırma yok
    expect(day("2026-09-05")).toEqual({ meta_spend: 75, meta_source: "trueprofit" });
    expect(day("2026-09-25")).toEqual({ meta_spend: 150, meta_source: "csv" });
    const sep = c.prepare("select sum(meta_spend) v from daily_pnl where substr(date,1,7) = '2026-09'").get() as { v: number };
    expect(sep.v).toBeCloseTo(3000, 6);
  });
});
