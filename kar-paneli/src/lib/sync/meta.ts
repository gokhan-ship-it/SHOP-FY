// Meta (Facebook) reklam verisi — yalnızca OKUMA (ads_read). Yalnızca izin listesindeki hesaplardan veri çekilir.
import { getDb } from "../db";
import { allowedAdAccounts, BLOCKED_AD_ACCOUNTS, env, META_API_VERSION, readEnv, SECRET_KEYS, writeEnv } from "../config";
import { rebuildDaily } from "../calc/recalc";
import { getSetting, setSetting } from "../settings";
import { addDays, addMonths, monthEnd, monthStart, todayIst, TZ } from "../time";
import { clearLockError, finishSync, lastSync, LockError, setLockError, startSync } from "./log";
import { fetchWithTimeout, HttpError, scrub, sleep } from "./http";

const GRAPH = `https://graph.facebook.com/${META_API_VERSION}`;

function secrets(): string[] {
  const e = readEnv();
  return SECRET_KEYS.map((k) => e[k] ?? "");
}

export function metaConfigured(): boolean {
  return !!env("META_ACCESS_TOKEN") && accountsToSync().length > 0;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80000, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80009, 80014]);

interface GraphError {
  error?: { message: string; code: number; error_subcode?: number; type?: string };
}

/** Graph API GET. Anahtar başlıkta gider; URL'ye ve hata mesajlarına yazılmaz. */
async function graphGet<T>(pathOrUrl: string, params: Record<string, string> = {}): Promise<T> {
  const token = env("META_ACCESS_TOKEN");
  if (!token) throw new Error("Meta anahtarı girilmemiş. Kurulum ekranından girin.");
  const url = pathOrUrl.startsWith("https://") ? new URL(pathOrUrl) : new URL(GRAPH + pathOrUrl);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.delete("access_token");
  for (let attempt = 0; attempt < 8; attempt++) {
    const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Bearer ${token}` } }, 120000);
    const j = (await res.json().catch(() => ({}))) as T & GraphError;
    if (res.ok && !j.error) {
      await respectUsage(res);
      return j;
    }
    const code = j.error?.code ?? 0;
    if (RATE_LIMIT_CODES.has(code) || res.status >= 500) {
      const wait = usageWaitMs(res) ?? Math.min(15 * 60 * 1000, 30000 * 2 ** attempt);
      await sleep(wait);
      continue;
    }
    if (code === 190) throw new HttpError("Meta anahtarının süresi dolmuş ya da geçersiz. Ayarlar ekranından anahtarı yenileyin.", res.status);
    if (code === 200 || code === 10) throw new HttpError("Meta anahtarının bu reklam hesabını okuma izni yok (ads_read gerekli).", res.status);
    throw new HttpError("Meta hatası: " + scrub(j.error?.message ?? `HTTP ${res.status}`, secrets()), res.status);
  }
  throw new HttpError("Meta hız sınırı nedeniyle istek tamamlanamadı; bir sonraki turda devam edilecek.", 429);
}

function usageWaitMs(res: Response): number | null {
  for (const h of ["x-business-use-case-usage", "x-ad-account-usage"]) {
    const v = res.headers.get(h);
    if (!v) continue;
    try {
      const j = JSON.parse(v) as Record<string, { estimated_time_to_regain_access?: number }[]> & { reset_time_duration?: number };
      if (typeof j.reset_time_duration === "number" && j.reset_time_duration > 0) return j.reset_time_duration * 1000;
      for (const arr of Object.values(j)) {
        if (!Array.isArray(arr)) continue;
        const m = Math.max(...arr.map((x) => x.estimated_time_to_regain_access ?? 0));
        if (m > 0) return m * 60 * 1000;
      }
    } catch {
      /* yok say */
    }
  }
  return null;
}

/** Kullanım %75'i geçtiyse yavaşla. */
async function respectUsage(res: Response) {
  for (const h of ["x-business-use-case-usage", "x-ad-account-usage", "x-app-usage"]) {
    const v = res.headers.get(h);
    if (!v) continue;
    const nums = [...v.matchAll(/"(?:call_count|total_cputime|total_time|acc_id_util_pct)"\s*:\s*(\d+(?:\.\d+)?)/g)].map((m) => Number(m[1]));
    const max = nums.length ? Math.max(...nums) : 0;
    if (max >= 90) await sleep(60000);
    else if (max >= 75) await sleep(10000);
  }
}

async function graphAll<T>(path: string, params: Record<string, string>): Promise<T[]> {
  const out: T[] = [];
  let page = await graphGet<{ data: T[]; paging?: { next?: string } }>(path, params);
  out.push(...page.data);
  while (page.paging?.next) {
    page = await graphGet<{ data: T[]; paging?: { next?: string } }>(page.paging.next);
    out.push(...page.data);
  }
  return out;
}

// ---------- Kilit ----------

/** Yalnızca izinli ve engelli olmayan hesaplar. Başka hiçbir hesap için istek atılmaz. */
export function accountsToSync(): string[] {
  return allowedAdAccounts().filter((a) => !BLOCKED_AD_ACCOUNTS.includes(a));
}

function assertAllowed(account: string) {
  if (!accountsToSync().includes(account)) {
    const msg = `${account} izin listesinde değil; bu hesaptan veri çekilmez.`;
    setLockError("meta", msg);
    throw new LockError(msg);
  }
}

export async function checkAccount(account: string) {
  assertAllowed(account);
  const a = await graphGet<{ id: string; name: string; timezone_name: string; currency: string; account_status: number }>(`/${account}`, {
    fields: "id,name,timezone_name,currency,account_status",
  });
  if (a.id !== account) {
    const msg = `Meta beklenmeyen hesap döndürdü (${a.id}). Senkron durduruldu.`;
    setLockError("meta", msg);
    throw new LockError(msg);
  }
  getDb()
    .$client.prepare("update ad_accounts set name = ?, timezone = ?, currency = ?, last_checked_at = ? where id = ?")
    .run(a.name, a.timezone_name, a.currency, new Date().toISOString(), account);
  return a;
}

// ---------- Insights ----------

const FIELDS = "account_id,campaign_id,campaign_name,adset_id,adset_name,ad_id,ad_name,spend,impressions,clicks,inline_link_clicks,cpm,ctr,actions,action_values";

interface InsightRow {
  date_start: string;
  account_id: string;
  campaign_id?: string;
  campaign_name?: string;
  adset_id?: string;
  adset_name?: string;
  ad_id?: string;
  ad_name?: string;
  spend?: string;
  impressions?: string;
  clicks?: string;
  inline_link_clicks?: string;
  cpm?: string;
  ctr?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

type Level = "account" | "campaign" | "adset" | "ad";
export const LEVELS: Level[] = ["account", "campaign", "adset", "ad"];

function pickAction(list: { action_type: string; value: string }[] | undefined, kind: "purchase" | "add_to_cart" | "initiate_checkout"): number | null {
  if (!list) return null;
  const pref = [`omni_${kind}`, kind, `offsite_conversion.fb_pixel_${kind}`, `onsite_web_${kind}`];
  for (const p of pref) {
    const hit = list.find((a) => a.action_type === p);
    if (hit) return Number(hit.value);
  }
  return null;
}

async function fetchInsights(account: string, level: Level, since: string, until: string, currency: string | null): Promise<number> {
  assertAllowed(account);
  const rows = await graphAll<InsightRow>(`/${account}/insights`, {
    level,
    time_increment: "1",
    time_range: JSON.stringify({ since, until }),
    fields: FIELDS,
    limit: "500",
  });
  const c = getDb().$client;
  const now = new Date().toISOString();
  const ins = c.prepare(
    `insert into ad_insights_daily (level, entity_id, account_id, name, campaign_id, adset_id, date, spend, impressions, clicks, inline_link_clicks,
       cpm, ctr, purchases, purchase_value, add_to_cart, initiate_checkout, actions_json, action_values_json, currency, fetched_at)
     values (@level, @entityId, @accountId, @name, @campaignId, @adsetId, @date, @spend, @impressions, @clicks, @inline, @cpm, @ctr,
       @purchases, @purchaseValue, @atc, @ic, @actions, @values, @currency, @now)
     on conflict(level, entity_id, date) do update set name=excluded.name, spend=excluded.spend, impressions=excluded.impressions,
       clicks=excluded.clicks, inline_link_clicks=excluded.inline_link_clicks, cpm=excluded.cpm, ctr=excluded.ctr, purchases=excluded.purchases,
       purchase_value=excluded.purchase_value, add_to_cart=excluded.add_to_cart, initiate_checkout=excluded.initiate_checkout,
       actions_json=excluded.actions_json, action_values_json=excluded.action_values_json, currency=excluded.currency, fetched_at=excluded.fetched_at`,
  );
  c.transaction(() => {
    // Meta geriye dönük düzeltme yapar: aralıktaki eski satırlar silinip yenileri yazılır (sıfıra düşen varlıklar dahil)
    c.prepare("delete from ad_insights_daily where account_id = ? and level = ? and date between ? and ?").run(account, level, since, until);
    for (const r of rows) {
      const entityId = level === "account" ? account : level === "campaign" ? r.campaign_id! : level === "adset" ? r.adset_id! : r.ad_id!;
      const name = level === "account" ? null : level === "campaign" ? r.campaign_name : level === "adset" ? r.adset_name : r.ad_name;
      ins.run({
        level,
        entityId,
        accountId: account,
        name: name ?? null,
        campaignId: r.campaign_id ?? null,
        adsetId: r.adset_id ?? null,
        date: r.date_start,
        spend: Number(r.spend ?? 0),
        impressions: Number(r.impressions ?? 0),
        clicks: Number(r.clicks ?? 0),
        inline: Number(r.inline_link_clicks ?? 0),
        cpm: r.cpm ? Number(r.cpm) : null,
        ctr: r.ctr ? Number(r.ctr) : null,
        purchases: pickAction(r.actions, "purchase"),
        purchaseValue: pickAction(r.action_values, "purchase"),
        atc: pickAction(r.actions, "add_to_cart"),
        ic: pickAction(r.actions, "initiate_checkout"),
        actions: r.actions ? JSON.stringify(r.actions) : null,
        values: r.action_values ? JSON.stringify(r.action_values) : null,
        currency,
        now,
      });
    }
  })();
  return rows.length;
}

async function syncEntities(account: string) {
  assertAllowed(account);
  const c = getDb().$client;
  const ins = c.prepare(
    `insert into ad_entities (level, id, account_id, parent_id, name, status, effective_status, created_time, raw_json) values (?,?,?,?,?,?,?,?,?)
     on conflict(level, id) do update set parent_id=excluded.parent_id, name=excluded.name, status=excluded.status,
       effective_status=excluded.effective_status, created_time=excluded.created_time, raw_json=excluded.raw_json`,
  );
  const defs: { level: "campaign" | "adset" | "ad"; edge: string; fields: string; parent: (x: Record<string, string>) => string | null }[] = [
    { level: "campaign", edge: "campaigns", fields: "id,name,status,effective_status,created_time,objective", parent: () => null },
    { level: "adset", edge: "adsets", fields: "id,name,status,effective_status,created_time,campaign_id", parent: (x) => x.campaign_id ?? null },
    { level: "ad", edge: "ads", fields: "id,name,status,effective_status,created_time,adset_id,campaign_id", parent: (x) => x.adset_id ?? null },
  ];
  for (const d of defs) {
    const rows = await graphAll<Record<string, string>>(`/${account}/${d.edge}`, { fields: d.fields, limit: "500" });
    c.transaction(() => {
      for (const r of rows) ins.run(d.level, r.id, account, d.parent(r), r.name ?? null, r.status ?? null, r.effective_status ?? null, r.created_time ?? null, JSON.stringify(r));
    })();
  }
}

/** Aralığı ≤ 31 günlük parçalara böler. */
function chunks(from: string, to: string, days = 31): [string, string][] {
  const out: [string, string][] = [];
  for (let s = from; s <= to; s = addDays(s, days)) {
    const e = addDays(s, days - 1);
    out.push([s, e < to ? e : to]);
  }
  return out;
}

// ---------- Anahtar (token) işlemleri ----------

export async function exchangeToken(appId: string, appSecret: string, shortToken: string): Promise<{ token: string; expiresAt: string | null }> {
  const url = new URL(`${GRAPH}/oauth/access_token`);
  url.searchParams.set("grant_type", "fb_exchange_token");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("client_secret", appSecret);
  url.searchParams.set("fb_exchange_token", shortToken);
  const res = await fetchWithTimeout(url.toString(), {}, 60000);
  const j = (await res.json().catch(() => ({}))) as { access_token?: string; expires_in?: number } & GraphError;
  if (!res.ok || !j.access_token) throw new HttpError("Uzun ömürlü anahtar alınamadı: " + scrub(j.error?.message ?? `HTTP ${res.status}`, [appSecret, shortToken]), res.status);
  const info = await debugToken(appId, appSecret, j.access_token).catch(() => null);
  const expiresAt = info?.expiresAt ?? (j.expires_in ? new Date(Date.now() + j.expires_in * 1000).toISOString() : null);
  return { token: j.access_token, expiresAt };
}

export async function debugToken(appId: string, appSecret: string, token: string): Promise<{ expiresAt: string | null; scopes: string[]; valid: boolean }> {
  const url = new URL(`${GRAPH}/debug_token`);
  url.searchParams.set("input_token", token);
  const res = await fetchWithTimeout(url.toString(), { headers: { Authorization: `Bearer ${appId}|${appSecret}` } }, 60000);
  const j = (await res.json().catch(() => ({}))) as { data?: { expires_at?: number; scopes?: string[]; is_valid?: boolean } } & GraphError;
  if (!res.ok || !j.data) throw new HttpError("Anahtar bilgisi okunamadı.", res.status);
  return {
    expiresAt: j.data.expires_at ? new Date(j.data.expires_at * 1000).toISOString() : null,
    scopes: j.data.scopes ?? [],
    valid: !!j.data.is_valid,
  };
}

export function saveMetaToken(token: string, expiresAt: string | null, appId?: string, appSecret?: string) {
  writeEnv({ META_ACCESS_TOKEN: token, META_TOKEN_EXPIRES_AT: expiresAt ?? "", ...(appId ? { META_APP_ID: appId } : {}), ...(appSecret ? { META_APP_SECRET: appSecret } : {}) });
}

export function tokenDaysLeft(): number | null {
  const e = env("META_TOKEN_EXPIRES_AT");
  if (!e) return null;
  return Math.floor((new Date(e).getTime() - Date.now()) / 86400000);
}

// ---------- Ana giriş ----------

let running = false;
export function metaRunning() {
  return running;
}

export type MetaMode = "artimli" | "gece" | "arsiv";

/**
 * artimli: son 7 gün (saatlik) · gece: son 30 gün (03:00) · arsiv: Meta'nın verdiği en eski aydan (37 ay) bugüne, aylık parçalar.
 * Arşiv yarıda kalırsa kaldığı aydan devam eder.
 */
export async function syncMeta(mode: MetaMode): Promise<{ status: "ok" | "hata" | "kilit" | "atlandi"; message: string }> {
  if (running) return { status: "atlandi", message: "Meta senkronu zaten çalışıyor." };
  if (!metaConfigured()) return { status: "atlandi", message: "Meta anahtarı henüz girilmedi." };
  running = true;
  const logId = startSync("meta", mode);
  const today = todayIst();
  let rows = 0;
  try {
    for (const account of accountsToSync()) {
      const acc = await checkAccount(account);
      if (acc.timezone_name !== TZ) setSetting(`meta_saat_dilimi_${account}`, acc.timezone_name);
      else setSetting(`meta_saat_dilimi_${account}`, "");

      if (mode === "arsiv") {
        const progressKey = `meta_arsiv_${account}`;
        const oldest = monthStart(addMonths(today, -36));
        let from = getSetting(progressKey) ? addDays(getSetting(progressKey)!, 1) : oldest;
        while (from <= today) {
          const to = monthEnd(from) < today ? monthEnd(from) : today;
          for (const level of LEVELS) for (const [s, e] of chunks(from, to, level === "ad" ? 10 : 31)) rows += await fetchInsights(account, level, s, e, acc.currency);
          setSetting(progressKey, to);
          setSetting("meta_ilerleme", `Meta arşivi: ${to.slice(0, 7)} tamam`);
          from = addDays(to, 1);
        }
        setSetting(`meta_arsiv_tamam_${account}`, "1");
      } else {
        // Mac kapalı kaldıysa: son başarılı senkrondan bu yana olan boşluk da dahil edilir
        const prev = lastSync("meta", { status: "ok" });
        const window = mode === "gece" ? 30 : 7;
        let from = addDays(today, -(window - 1));
        if (prev) {
          const gapFrom = addDays(prev.started_at.slice(0, 10), -3);
          if (gapFrom < from) from = gapFrom;
        }
        for (const level of LEVELS) for (const [s, e] of chunks(from, today, level === "ad" ? 10 : 31)) rows += await fetchInsights(account, level, s, e, acc.currency);
      }
      await syncEntities(account);
    }
    clearLockError("meta");
    rebuildDaily();
    finishSync(logId, "ok", `${rows} satır`, rows);
    setSetting("meta_ilerleme", "");
    return { status: "ok", message: `${rows} satır` };
  } catch (e) {
    const isLock = e instanceof LockError;
    const msg = scrub(e instanceof Error ? e.message : String(e), secrets());
    finishSync(logId, isLock ? "kilit" : "hata", msg);
    setSetting("meta_ilerleme", "");
    if (rows) rebuildDaily();
    return { status: isLock ? "kilit" : "hata", message: msg };
  } finally {
    running = false;
  }
}

export function metaArchiveDone(): boolean {
  return accountsToSync().every((a) => getSetting(`meta_arsiv_tamam_${a}`) === "1");
}
