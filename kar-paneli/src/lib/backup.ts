// Günlük veritabanı yedeği: yerel klasör + seçilen bulut klasörü (iCloud Drive / Google Drive). Son 30 kopya tutulur.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getDb } from "./db";
import { LOCAL_BACKUP_DIR } from "./paths";
import { getSetting, setSetting } from "./settings";
import { finishSync, startSync } from "./sync/log";

const KEEP = 30;
const PATTERN = /^ttn-\d{4}-\d{2}-\d{2}-\d{4}\.db$/;

export function cloudCandidates(): { label: string; path: string; exists: boolean }[] {
  const home = os.homedir();
  const out: { label: string; path: string; exists: boolean }[] = [];
  const icloud = path.join(home, "Library", "Mobile Documents", "com~apple~CloudDocs");
  out.push({ label: "iCloud Drive", path: path.join(icloud, "TTN-Kar-Yedek"), exists: fs.existsSync(icloud) });
  const cs = path.join(home, "Library", "CloudStorage");
  if (fs.existsSync(cs)) {
    for (const d of fs.readdirSync(cs).filter((x) => x.startsWith("GoogleDrive"))) {
      const my = ["My Drive", "Drive'ım", "Drive’ım"].map((x) => path.join(cs, d, x)).find((p) => fs.existsSync(p)) ?? path.join(cs, d);
      out.push({ label: `Google Drive (${d.replace(/^GoogleDrive-?/, "")})`, path: path.join(my, "TTN-Kar-Yedek"), exists: true });
    }
  }
  return out;
}

/** Ayar yoksa iCloud Drive varsayılır (kullanıcı kurulumda "sonra seçerim" dedi). */
export function backupDir(): string | null {
  const s = getSetting("yedek_klasoru");
  if (s) return s;
  const ic = cloudCandidates().find((c) => c.label === "iCloud Drive" && c.exists);
  return ic?.path ?? null;
}

function prune(dir: string) {
  const files = fs.readdirSync(dir).filter((f) => PATTERN.test(f)).sort();
  for (const f of files.slice(0, Math.max(0, files.length - KEEP))) fs.rmSync(path.join(dir, f), { force: true });
}

function stamp(): string {
  const p = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Istanbul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((a, x) => ((a[x.type] = x.value), a), {});
  return `${p.year}-${p.month}-${p.day}-${p.hour}${p.minute}`;
}

export async function runBackup(): Promise<{ status: "ok" | "hata"; message: string }> {
  const id = startSync("yedek", "gunluk");
  const name = `ttn-${stamp()}.db`;
  const done: string[] = [];
  const errors: string[] = [];
  try {
    fs.mkdirSync(LOCAL_BACKUP_DIR, { recursive: true });
    const local = path.join(LOCAL_BACKUP_DIR, name);
    await getDb().$client.backup(local);
    prune(LOCAL_BACKUP_DIR);
    done.push("yerel klasör");
    const cloud = backupDir();
    if (cloud) {
      try {
        fs.mkdirSync(cloud, { recursive: true });
        fs.copyFileSync(local, path.join(cloud, name));
        prune(cloud);
        done.push(cloud.includes("CloudDocs") ? "iCloud Drive" : cloud.includes("GoogleDrive") ? "Google Drive" : cloud);
      } catch (e) {
        errors.push(
          `Bulut klasörüne yazılamadı (${(e as NodeJS.ErrnoException).code ?? "hata"}). Mac "erişim izni" sorduysa izin verin; olmazsa Ayarlar'dan başka klasör seçin.`,
        );
      }
    } else errors.push("Bulut yedek klasörü seçilmemiş; yalnızca yerel yedek alındı.");
    setSetting("son_yedek", new Date().toISOString());
    const msg = `Yedek alındı: ${done.join(" + ")}${errors.length ? ". " + errors.join(" ") : ""}`;
    finishSync(id, errors.length && done.length < 2 && backupDir() ? "hata" : "ok", msg, done.length);
    return { status: "ok", message: msg };
  } catch (e) {
    const msg = `Yedek alınamadı: ${e instanceof Error ? e.message : String(e)}`;
    finishSync(id, "hata", msg);
    return { status: "hata", message: msg };
  }
}
