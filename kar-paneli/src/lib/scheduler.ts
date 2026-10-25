// Sunucu içi zamanlayıcı (brief §2). Dakikada bir kontrol eder; Mac kapalı kaldıysa açılışta eksikleri tamamlar.
import { getDb } from "./db";
import { importSeed } from "./seed";
import { recalcAll } from "./calc/recalc";
import { getSetting, setSetting } from "./settings";
import { closeStaleSyncs, lastSync } from "./sync/log";
import { shopifyConfigured, syncShopify } from "./sync/shopify";
import { metaArchiveDone, metaConfigured, syncMeta } from "./sync/meta";
import { syncFx } from "./sync/fx";
import { runBackup } from "./backup";
import { istHourMinute, todayIst } from "./time";

const MIN = 60 * 1000;
const holder = globalThis as unknown as { __ttnScheduler?: NodeJS.Timeout; __ttnBusy?: Record<string, boolean> };
holder.__ttnBusy ??= {};

function ageMs(iso: string | null | undefined): number {
  return iso ? Date.now() - new Date(iso).getTime() : Infinity;
}

/** Her kaynak kendi kilidiyle bağımsız çalışır; uzun Meta arşivi Shopify'ı bekletmez. */
function once(key: string, job: () => Promise<unknown>) {
  const busy = holder.__ttnBusy!;
  if (busy[key]) return;
  busy[key] = true;
  job()
    .catch((e) => console.error(`[zamanlayıcı:${key}]`, e instanceof Error ? e.message : e))
    .finally(() => (busy[key] = false));
}

function tick() {
  const { h } = istHourMinute();
  const today = todayIst();

  if (shopifyConfigured() && ageMs(lastSync("shopify")?.started_at) >= 15 * MIN) once("shopify", () => syncShopify());

  if (metaConfigured()) {
    if (!metaArchiveDone()) once("meta", () => syncMeta("arsiv"));
    else if (h === 3 && getSetting("meta_gece_tarihi") !== today)
      once("meta", async () => {
        const r = await syncMeta("gece");
        if (r.status === "ok") setSetting("meta_gece_tarihi", today);
      });
    else if (ageMs(lastSync("meta")?.started_at) >= 60 * MIN) once("meta", () => syncMeta("artimli"));
  }

  if (getSetting("kur_tarihi") !== today && (h >= 16 || ageMs(lastSync("kur", { status: "ok" })?.started_at) > 24 * 60 * MIN))
    once("kur", async () => {
      const r = await syncFx();
      if (r.status === "ok") setSetting("kur_tarihi", today);
    });

  // Yedek: 04:00'te; Mac o saatte kapalıysa açılınca (son yedek 26 saatten eskiyse)
  if ((h === 4 && getSetting("yedek_tarihi") !== today) || ageMs(getSetting("son_yedek")) > 26 * 60 * MIN)
    once("yedek", async () => {
      const r = await runBackup();
      if (r.status === "ok") setSetting("yedek_tarihi", today);
    });
}

export function startScheduler() {
  if (holder.__ttnScheduler) return;
  getDb();
  closeStaleSyncs();
  const log = importSeed(getDb());
  if (log.length) console.log("[kurulum] içe aktarıldı:", log.join(", "));
  // İlk açılışta (ya da şema/seed değişince) hesap tabloları üretilir
  if (getSetting("hesap_surumu") !== "1" || log.length) {
    recalcAll();
    setSetting("hesap_surumu", "1");
  }
  setTimeout(tick, 5000);
  holder.__ttnScheduler = setInterval(tick, MIN);
  holder.__ttnScheduler.unref?.();
}

/** "Şimdi senkronize et" düğmesi: arka planda başlatır, sonucu beklemez. */
export function triggerNow(what: "shopify" | "meta" | "kur" | "hepsi") {
  if (what === "shopify" || what === "hepsi") once("shopify", () => syncShopify({ products: true }));
  if (what === "meta" || what === "hepsi") once("meta", () => syncMeta(metaArchiveDone() ? "gece" : "arsiv"));
  if (what === "kur" || what === "hepsi") once("kur", () => syncFx());
}
