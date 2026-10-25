// Ads Manager'dan elle indirilen "gün" kırılımlı harcama raporunu içe aktarır.
// Meta geliştirici erişimi olmadığında API'nin yerine geçer. Kilit kuralları burada da geçerlidir.
import ExcelJS from "exceljs";
import { getDb } from "./db";
import { accountsToSync } from "./sync/meta";
import { BLOCKED_AD_ACCOUNTS, normalizeAdAccount } from "./config";
import { rebuildDaily } from "./calc/recalc";
import { detectDelimiter, parseCsv } from "./csv";
import { clearLockError, setLockError } from "./sync/log";
import { InputError } from "./services";
import { addDays, monthEnd } from "./time";

export type ReportLevel = "account" | "campaign" | "adset" | "ad";

export interface ReportRow {
  date: string;
  name: string | null;
  id: string | null;
  spend: number;
  impressions: number;
  clicks: number;
  linkClicks: number;
}

export interface ParsedReport {
  level: ReportLevel;
  currency: string;
  rows: ReportRow[];
  accountIds: string[];
  accountNames: string[];
  skippedTotals: number;
}

const norm = (s: string) =>
  s
    .replace(/^﻿/, "")
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/g, " ");

function findCol(headers: string[], patterns: RegExp[]): number {
  for (const p of patterns) {
    const i = headers.findIndex((h) => p.test(h));
    if (i >= 0) return i;
  }
  return -1;
}

/** "1.234,56" · "1234.56" · "1,234.56" · "₺1.234" → sayı */
export function parseAmount(raw: string): number | null {
  let s = (raw ?? "").replace(/[^\d.,-]/g, "");
  if (!s || s === "-") return null;
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    // ikisi de varsa sondaki ondalık ayracıdır
    if (lastComma > lastDot) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (lastComma >= 0) {
    const decimals = s.length - lastComma - 1;
    s = decimals === 3 && s.split(",").length > 1 && !/^0,/.test(s) ? s.replace(/,/g, "") : s.replace(/\./g, "").replace(",", ".");
  } else if (lastDot >= 0) {
    const parts = s.split(".");
    // Meta tutarları en fazla 2 ondalıklı yazar; noktadan sonra 3 hane varsa binlik ayracıdır
    if (parts.length > 2 || (parts[1]?.length === 3 && parts[0] !== "0")) s = s.replace(/\./g, "");
  }
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/** 2026-10-20 · 20.10.2026 · 20/10/2026 · 10/20/2026 → 2026-10-20 */
export function parseDay(raw: string): string | null {
  const s = (raw ?? "").trim();
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[./](\d{1,2})[./](\d{4})/.exec(s);
  if (m) {
    let d = Number(m[1]);
    let mo = Number(m[2]);
    // ABD biçimi (ay/gün) yalnızca gün 12'den büyükse anlaşılabilir; Türkçe arayüzde gün/ay varsayılır
    if (mo > 12 && d <= 12) [d, mo] = [mo, d];
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null;
    return `${m[3]}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return null;
}

function toTable(text: string): string[][] {
  return parseCsv(text, detectDelimiter(text));
}

async function xlsxToTable(buf: ArrayBuffer): Promise<string[][]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buf);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const out: string[][] = [];
  ws.eachRow({ includeEmpty: false }, (row) => {
    const cells: string[] = [];
    for (let i = 1; i <= ws.columnCount; i++) {
      const v = row.getCell(i).value as unknown;
      if (v instanceof Date) cells.push(v.toISOString().slice(0, 10));
      else if (v && typeof v === "object" && "result" in (v as Record<string, unknown>)) cells.push(String((v as { result: unknown }).result ?? ""));
      else if (v && typeof v === "object" && "text" in (v as Record<string, unknown>)) cells.push(String((v as { text: unknown }).text ?? ""));
      else cells.push(v === null || v === undefined ? "" : String(v));
    }
    out.push(cells);
  });
  return out;
}

export async function readReportFile(name: string, data: ArrayBuffer): Promise<string[][]> {
  if (/\.xlsx$/i.test(name)) return xlsxToTable(data);
  if (/\.xls$/i.test(name)) throw new InputError("Eski Excel (.xls) biçimi okunamıyor. Raporu CSV ya da .xlsx olarak indirin.");
  return toTable(new TextDecoder("utf-8").decode(data));
}

export function parseReport(table: string[][], fileName = ""): ParsedReport {
  if (table.length < 2) throw new InputError("Dosyada veri satırı yok.");
  const headers = table[0].map(norm);
  const dayCol = findCol(headers, [/^(gün|day|tarih|date)$/]);
  const startCol = findCol(headers, [/^raporlama başlangıcı$/, /^reporting starts?$/, /başlangıç/, /^start/]);
  const endCol = findCol(headers, [/^raporlama bitişi$/, /^reporting ends?$/, /bitiş/, /^end/]);
  const spendCol = findCol(headers, [/^harcanan tutar/, /^amount spent/, /^spend/, /^harcama/]);
  if (spendCol < 0) throw new InputError("“Harcanan tutar” sütunu bulunamadı. Raporu Reklam Yöneticisi'nden harcama sütunu görünürken indirin.");
  if (dayCol < 0 && startCol < 0) throw new InputError("Tarih sütunu bulunamadı. Raporu “Kırılım → Zamana göre → Gün” seçiliyken indirin.");

  const currency = /\(([a-z]{3})\)/i.exec(table[0][spendCol])?.[1]?.toUpperCase() ?? "TRY";
  const col = (pats: RegExp[]) => findCol(headers, pats);
  const levels: [ReportLevel, number, number][] = [
    ["ad", col([/^reklam adı$/, /^ad name$/]), col([/^reklam kimliği$/, /^ad id$/])],
    ["adset", col([/^reklam seti adı$/, /^ad set name$/]), col([/^reklam seti kimliği$/, /^ad set id$/])],
    ["campaign", col([/^kampanya adı$/, /^campaign name$/]), col([/^kampanya kimliği$/, /^campaign id$/])],
  ];
  const hit = levels.find(([, n, i]) => n >= 0 || i >= 0);
  const level: ReportLevel = hit ? hit[0] : "account";
  const nameCol = hit ? hit[1] : -1;
  const idCol = hit ? hit[2] : -1;
  const accIdCol = col([/^hesap kimliği$/, /^account id$/, /^reklam hesabı kimliği$/]);
  const accNameCol = col([/^hesap adı$/, /^account name$/, /^reklam hesabı adı$/]);
  const impCol = col([/^gösterim/, /^impressions/]);
  const linkCol = col([/^bağlantı tıklamaları/, /^link clicks/]);
  const clickCol = col([/^tıklamalar \(tümü\)/, /^clicks \(all\)/, /^tıklamalar$/, /^clicks$/]);

  // Kilit: dosyanın içeriğinde ya da adında JantiFox geçiyorsa hiçbir şey yazılmaz
  const flat = (fileName + " " + table.map((r) => r.join(" ")).join(" ")).toLocaleLowerCase("tr-TR");
  if (/jantifox/.test(flat) || BLOCKED_AD_ACCOUNTS.some((a) => flat.includes(a.replace("act_", "")))) {
    setLockError("meta", "Yüklenen raporda JantiFox hesabı görünüyor. Dosya reddedildi, hiçbir veri yazılmadı.");
    throw new InputError("Bu rapor JantiFox hesabına ait görünüyor. Dosya reddedildi, hiçbir veri yazılmadı. Reklam Yöneticisi'nde sol üstten “Text To Next” hesabını seçip tekrar indirin.");
  }

  const rows: ReportRow[] = [];
  const accountIds = new Set<string>();
  const accountNames = new Set<string>();
  let skippedTotals = 0;
  for (const r of table.slice(1)) {
    if (r.every((c) => !c.trim())) continue;
    const name = nameCol >= 0 ? r[nameCol]?.trim() || null : null;
    const id = idCol >= 0 ? r[idCol]?.trim() || null : null;
    const label = (name ?? "").toLocaleLowerCase("tr-TR");
    // Toplam satırı: seviye sütunu boş ya da "Toplam/Total"
    if (level !== "account" && (!name && !id)) {
      skippedTotals++;
      continue;
    }
    if (/^(toplam|total|sonuçlar|results)\b/.test(label)) {
      skippedTotals++;
      continue;
    }
    let date: string | null = null;
    if (dayCol >= 0) date = parseDay(r[dayCol]);
    if (!date && startCol >= 0) {
      const s = parseDay(r[startCol]);
      const e = endCol >= 0 ? parseDay(r[endCol]) : s;
      if (s && e && s !== e)
        throw new InputError(
          `Raporda birden çok günü kapsayan satırlar var (${s} – ${e}). Reklam Yöneticisi'nde “Kırılım → Zamana göre → Gün” seçip tekrar indirin.`,
        );
      date = s;
    }
    if (!date) {
      skippedTotals++;
      continue;
    }
    const spend = parseAmount(r[spendCol]) ?? 0;
    if (accIdCol >= 0 && r[accIdCol]?.trim()) accountIds.add(normalizeAdAccount(r[accIdCol].replace(/\D/g, "")));
    if (accNameCol >= 0 && r[accNameCol]?.trim()) accountNames.add(r[accNameCol].trim());
    rows.push({
      date,
      name,
      id,
      spend,
      impressions: impCol >= 0 ? Math.round(parseAmount(r[impCol]) ?? 0) : 0,
      clicks: clickCol >= 0 ? Math.round(parseAmount(r[clickCol]) ?? 0) : 0,
      linkClicks: linkCol >= 0 ? Math.round(parseAmount(r[linkCol]) ?? 0) : 0,
    });
  }
  if (!rows.length) throw new InputError("Dosyada tarihli harcama satırı bulunamadı. Raporu “Gün” kırılımıyla indirin.");
  return { level, currency, rows, accountIds: [...accountIds], accountNames: [...accountNames], skippedTotals };
}

export interface ImportSummary {
  account: string;
  level: ReportLevel;
  from: string;
  to: string;
  days: number;
  total: number;
  currency: string;
  accountVerified: boolean;
  tpCompare: { month: string; csv: number; tp: number }[];
}

/** Ayrıştırılmış raporu yazar. Dosyadaki günler için önceki kayıtların yerine geçer. */
export function importReport(p: ParsedReport): ImportSummary {
  const allowed = accountsToSync();
  // Hesap: dosyada numara varsa izin listesinde olmalı; yoksa tek izinli hesap varsayılır
  let account: string;
  if (p.accountIds.length) {
    const bad = p.accountIds.filter((a) => !allowed.includes(a));
    if (bad.length) {
      setLockError("meta", `Yüklenen raporda izinsiz hesap var (${bad.join(", ")}). Dosya reddedildi, hiçbir veri yazılmadı.`);
      throw new InputError(`Raporda izin listesinde olmayan hesap var: ${bad.join(", ")}. Dosya reddedildi, hiçbir veri yazılmadı.`);
    }
    if (p.accountIds.length > 1) throw new InputError("Rapor birden çok reklam hesabı içeriyor. Her hesap için ayrı rapor yükleyin.");
    account = p.accountIds[0];
  } else {
    if (allowed.length !== 1) throw new InputError("Raporda hesap numarası yok ve birden çok izinli hesap var. Rapora “Hesap kimliği” sütununu ekleyip tekrar indirin.");
    account = allowed[0];
  }

  const c = getDb().$client;
  const knownName = (c.prepare("select name from ad_accounts where id = ?").get(account) as { name: string | null } | undefined)?.name;
  const lower = (x: string) => x.toLocaleLowerCase("tr-TR");
  const nameOk = (n: string) => (knownName ? lower(n) === lower(knownName) : /text ?to ?next/.test(lower(n)));
  if (p.accountNames.length && !p.accountNames.every(nameOk)) {
    setLockError("meta", `Yüklenen rapordaki hesap adı (${p.accountNames.join(", ")}) Text To Next değil. Dosya reddedildi, hiçbir veri yazılmadı.`);
    throw new InputError(`Rapordaki hesap adı (${p.accountNames.join(", ")}) Text To Next hesabıyla eşleşmiyor. Dosya reddedildi, hiçbir veri yazılmadı.`);
  }

  const days = [...new Set(p.rows.map((r) => r.date))].sort();
  const from = days[0];
  const to = days[days.length - 1];
  const byDay = new Map<string, { spend: number; imp: number; clicks: number; link: number }>();
  for (const r of p.rows) {
    const a = byDay.get(r.date) ?? { spend: 0, imp: 0, clicks: 0, link: 0 };
    a.spend += r.spend;
    a.imp += r.impressions;
    a.clicks += r.clicks;
    a.link += r.linkClicks;
    byDay.set(r.date, a);
  }
  // Aralıktaki rapor günleri: dosyada olmayan ama aralığa düşen günler harcama 0 kabul edilir
  for (let d = from; d <= to; d = addDays(d, 1)) if (!byDay.has(d)) byDay.set(d, { spend: 0, imp: 0, clicks: 0, link: 0 });

  const now = new Date().toISOString();
  const ins = c.prepare(
    `insert or replace into ad_insights_daily (level, entity_id, account_id, name, date, spend, impressions, clicks, inline_link_clicks, currency, source, fetched_at)
     values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'csv', ?)`,
  );
  c.transaction(() => {
    c.prepare("delete from ad_insights_daily where account_id = ? and level = 'account' and date between ? and ?").run(account, from, to);
    if (p.level !== "account")
      c.prepare("delete from ad_insights_daily where account_id = ? and level = ? and source = 'csv' and date between ? and ?").run(account, p.level, from, to);
    for (const [d, a] of byDay) ins.run("account", account, account, null, d, a.spend, a.imp, a.clicks, a.link, p.currency, now);
    if (p.level !== "account") {
      const ents = new Map<string, ReportRow>();
      for (const r of p.rows) {
        const key = `${r.id ? r.id : "csv:" + r.name}|${r.date}`;
        const e = ents.get(key);
        if (e) {
          e.spend += r.spend;
          e.impressions += r.impressions;
          e.clicks += r.clicks;
          e.linkClicks += r.linkClicks;
        } else ents.set(key, { ...r });
      }
      for (const r of ents.values()) ins.run(p.level, r.id ?? `csv:${r.name}`, account, r.name, r.date, r.spend, r.impressions, r.clicks, r.linkClicks, p.currency, now);
    }
  })();
  clearLockError("meta");
  rebuildDaily();

  // Güven kontrolü: TrueProfit'in aynı aylardaki reklam toplamıyla karşılaştırma
  const tpCompare: ImportSummary["tpCompare"] = [];
  const months = [...new Set(days.map((d) => d.slice(0, 7)))];
  for (const m of months) {
    const tp = c.prepare("select facebook_ad_spend v from tp_monthly where month = ?").get(m) as { v: number | null } | undefined;
    if (!tp?.v) continue;
    // Yalnızca rapor ayın TrueProfit'in saydığı günlerinin tamamını kapsıyorsa karşılaştır
    const tpLast = (c.prepare("select max(date) d from tp_orders where substr(date,1,7) = ?").get(m) as { d: string | null }).d;
    const isLatest = !(c.prepare("select 1 from tp_monthly where month > ? and facebook_ad_spend > 0").get(m));
    const need = isLatest && tpLast ? tpLast : monthEnd(m + "-01");
    if (from > m + "-01" || to < need) continue;
    const full = (c.prepare("select coalesce(sum(spend),0) v from ad_insights_daily where account_id = ? and level = 'account' and substr(date,1,7) = ?").get(account, m) as { v: number }).v;
    tpCompare.push({ month: m, csv: full, tp: tp.v });
  }

  return {
    account,
    level: p.level,
    from,
    to,
    days: byDay.size,
    total: p.rows.reduce((s, r) => s + r.spend, 0),
    currency: p.currency,
    accountVerified: p.accountIds.length > 0 || p.accountNames.length > 0,
    tpCompare,
  };
}

/** Elle yüklenen ya da API'den gelen son reklam günü (TrueProfit yedeği dahil değil). */
export function lastAdDataDate(): string | null {
  return (getDb().$client.prepare("select max(date) d from ad_insights_daily where level = 'account'").get() as { d: string | null }).d;
}
