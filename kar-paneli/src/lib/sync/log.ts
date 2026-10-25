import { getDb } from "../db";
import { getJsonSetting, setJsonSetting } from "../settings";

export type SyncSource = "shopify" | "shopify-urun" | "meta" | "kur" | "yedek";

export function startSync(source: SyncSource, kind: string): number {
  const r = getDb()
    .$client.prepare("insert into sync_log (source, kind, started_at, status) values (?, ?, ?, 'calisiyor') returning id")
    .get(source, kind, new Date().toISOString()) as { id: number };
  return r.id;
}

export function finishSync(id: number, status: "ok" | "hata" | "kilit", message?: string | null, rows?: number | null, cursor?: string | null) {
  getDb()
    .$client.prepare("update sync_log set finished_at = ?, status = ?, message = ?, rows = ?, cursor = ? where id = ?")
    .run(new Date().toISOString(), status, message ? message.slice(0, 2000) : null, rows ?? null, cursor ?? null, id);
}

export interface SyncRow {
  id: number;
  source: string;
  kind: string;
  started_at: string;
  finished_at: string | null;
  status: string;
  message: string | null;
  rows: number | null;
  cursor: string | null;
}

export function lastSync(source: SyncSource, opts: { status?: string; kind?: string } = {}): SyncRow | undefined {
  const where = ["source = ?"];
  const args: string[] = [source];
  if (opts.status) {
    where.push("status = ?");
    args.push(opts.status);
  }
  if (opts.kind) {
    where.push("kind = ?");
    args.push(opts.kind);
  }
  return getDb()
    .$client.prepare(`select * from sync_log where ${where.join(" and ")} order by id desc limit 1`)
    .get(...args) as SyncRow | undefined;
}

export function recentSyncs(limit = 30): SyncRow[] {
  return getDb().$client.prepare("select * from sync_log order by id desc limit ?").all(limit) as SyncRow[];
}

/** Uygulama çökünce yarım kalan kayıtları kapatır. */
export function closeStaleSyncs() {
  getDb()
    .$client.prepare("update sync_log set status = 'hata', finished_at = ?, message = coalesce(message, 'Yarıda kesildi (uygulama kapandı); otomatik yeniden denenecek.') where status = 'calisiyor'")
    .run(new Date().toISOString());
}

// ---------- Kilit durumu ----------

export interface LockState {
  source: "shopify" | "meta";
  message: string;
  at: string;
}

export function getLockErrors(): LockState[] {
  return getJsonSetting<LockState[]>("kilit_hatalari", []);
}

export function setLockError(source: LockState["source"], message: string) {
  const cur = getLockErrors().filter((x) => x.source !== source);
  cur.push({ source, message, at: new Date().toISOString() });
  setJsonSetting("kilit_hatalari", cur);
}

export function clearLockError(source: LockState["source"]) {
  setJsonSetting(
    "kilit_hatalari",
    getLockErrors().filter((x) => x.source !== source),
  );
}

export class LockError extends Error {}
